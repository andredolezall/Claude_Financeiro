/**
 * ConciliarCR — Office Script (Excel na web → Automatizar).
 *
 * Faz a conciliação COMPLETA dentro do Excel: lê a CR ao vivo + a aba "Boletos"
 * (colada do Conciliador web), casa por NF, preenche PAGO? = "S" e DATA RECEBIMENTO
 * nas linhas certas e lista as divergências em "Conciliação Revisar".
 * Preserva pivôs, gráficos e DRE — escreve só nas células PAGO?/DATA das linhas casadas.
 *
 * Lógica idêntica ao motor validado (web/engine.js ↔ financeiro/preenchimento.py):
 * casa por soma de NF; FIFO por vencimento na distribuição de datas; nunca sobrescreve "S".
 *
 * USO (uma vez por dia, sem baixar a planilha):
 *   1. No Conciliador web, suba o consultaCBR e clique "Copiar boletos p/ Excel".
 *   2. Aqui no Excel, aba "Boletos", clique A1 e cole (Ctrl+V).
 *   3. Automatizar → ConciliarCR. Pronto: CR preenchida + divergências em "Conciliação Revisar".
 */

const CR_SHEET = "CR - Contas a Receber";
const BOLETOS = "Boletos";
const REVISAR = "Conciliação Revisar";

function main(workbook: ExcelScript.Workbook): string {
  const bolWs = workbook.getWorksheet(BOLETOS);
  if (!bolWs) return `ERRO: crie a aba "${BOLETOS}" e cole nela os boletos do Conciliador.`;
  const crWs = workbook.getWorksheet(CR_SHEET);
  if (!crWs) return `ERRO: aba "${CR_SHEET}" não encontrada.`;

  // ---------- lê os boletos ----------
  const bRange = bolWs.getUsedRange();
  if (!bRange || bRange.getRowCount() < 2) return `ERRO: aba "${BOLETOS}" vazia. Cole os boletos.`;
  const bVals = bRange.getValues();
  const bHead = (bVals[0] as (string | number)[]).map((h) => String(h).trim());
  const bi = (n: string) => bHead.indexOf(n);
  const biNF = bi("Seu Número"), biVal = bi("Valor"), biLiq = bi("Valor Liquidação"),
        biData = bi("Data Situação"), biSit = bi("Situação");
  if (biNF < 0 || biVal < 0 || biLiq < 0 || biData < 0)
    return 'ERRO: nos Boletos faltou coluna (Seu Número, Valor, Valor Liquidação, Data Situação).';

  type Bol = { nf: string; nominal: number; liquidado: number; dataLiq: number };
  const bol: Bol[] = [];
  for (let i = 1; i < bVals.length; i++) {
    const r = bVals[i] as (string | number)[];
    const nominal = toCents(r[biVal]), liquidado = toCents(r[biLiq]), dataLiq = toSerial(r[biData]);
    const nf = normNF(r[biNF]);
    if (nf && dataLiq != null && liquidado != null && liquidado > 0 && nominal != null)
      bol.push({ nf, nominal, liquidado, dataLiq });
  }

  // ---------- lê a CR ao vivo ----------
  const crRange = crWs.getUsedRange();
  const crVals = crRange.getValues();
  const base = crRange.getRowIndex(), baseCol = crRange.getColumnIndex();
  const cHead = (crVals[0] as (string | number)[]).map((h) => String(h).trim());
  const ci = (n: string) => cHead.indexOf(n);
  const cNF = ci("NF"), cVal = ci("VALOR TOTAL"), cPago = ci("PAGO?"),
        cData = ci("DATA RECEBIMENTO"), cVenc = ci("VENCIMENTO"), cCli = ci("CLIENTE");
  if ([cNF, cVal, cPago, cData, cVenc].some((x) => x < 0))
    return "ERRO: na CR faltou coluna (NF, VALOR TOTAL, PAGO?, DATA RECEBIMENTO, VENCIMENTO).";

  type Cr = { idx: number; nf: string; valor: number; venc: number; pago: boolean; cliente: string };
  const cr: Cr[] = [];
  for (let i = 1; i < crVals.length; i++) {
    const r = crVals[i] as (string | number)[];
    const valor = toCents(r[cVal]);
    if (valor == null || valor === 0) continue;
    cr.push({
      idx: i, nf: normNF(r[cNF]), valor,
      venc: toSerial(r[cVenc]) ?? 0,
      pago: String(r[cPago] || "").trim().toUpperCase() === "S",
      cliente: cCli >= 0 ? String(r[cCli] || "").trim() : "",
    });
  }

  // ---------- conciliação por NF (porta reconcileCR) ----------
  const bolPorNF: { [k: string]: Bol[] } = {}, crPorNF: { [k: string]: Cr[] } = {};
  bol.forEach((b) => (bolPorNF[b.nf] = bolPorNF[b.nf] || []).push(b));
  cr.forEach((t) => (crPorNF[t.nf] = crPorNF[t.nf] || []).push(t));

  type Fill = { idx: number; serial: number };
  const fills: Fill[] = [];
  const decidir: (string | number)[][] = [];
  let nConc = 0, nDiv = 0, nSemBol = 0;

  Object.keys(crPorNF).sort().forEach((nf) => {
    const rows = crPorNF[nf], bols = bolPorNF[nf] || [];
    const somaCR = rows.reduce((s, t) => s + t.valor, 0);
    const somaBol = bols.reduce((s, b) => s + b.nominal, 0);
    if (!bols.length) { nSemBol++; return; }
    const chaves = bols.map((b) => b.nominal + "@" + b.dataLiq);
    const ambiguo = bols.length > 1 && new Set(chaves).size < chaves.length && bols.length !== rows.length;

    if (somaCR === somaBol && !ambiguo) {
      nConc++;
      const datas = atribuirDatas(rows, bols);
      rows.forEach((t, i) => { if (!t.pago) fills.push({ idx: t.idx, serial: datas[i] }); });
    } else {
      nDiv++;
      rows.forEach((t) =>
        decidir.push([ambiguo ? "AMBÍGUO" : "DIVERGENTE", nf, t.cliente, t.valor / 100,
          somaCR / 100, somaBol / 100, (somaCR - somaBol) / 100]));
    }
  });

  // ---------- grava os preenchimentos na CR ----------
  let gravados = 0;
  for (const f of fills) {
    const r = base + f.idx;
    crWs.getRangeByIndexes(r, baseCol + cPago, 1, 1).setValue("S");
    const d = crWs.getRangeByIndexes(r, baseCol + cData, 1, 1);
    d.setValue(f.serial);
    d.setNumberFormat("dd/mm/yyyy");
    gravados++;
  }

  // ---------- escreve as divergências em "Conciliação Revisar" ----------
  let rev = workbook.getWorksheet(REVISAR);
  if (!rev) rev = workbook.addWorksheet(REVISAR);
  rev.getUsedRange()?.clear(ExcelScript.ClearApplyTo.contents);
  const revHead = ["TIPO", "NF", "CLIENTE", "VALOR", "SOMA CR (NF)", "SOMA BOLETOS (NF)", "DIFERENÇA"];
  const saida = [revHead].concat(decidir as (string | number)[][]);
  rev.getRangeByIndexes(0, 0, saida.length, revHead.length).setValues(saida as (string | number)[][]);

  const resumo =
    `OK: ${gravados} linha(s) preenchida(s) na CR. ` +
    `${nConc} NF conciliada(s), ${nDiv} divergente(s) (aba ${REVISAR}), ${nSemBol} sem boleto.`;
  console.log(resumo);
  return resumo;
}

// ----------------------------- distribuição de datas (FIFO) -----------------------------
function atribuirDatas(rows: { valor: number; venc: number }[],
                       bols: { nominal: number; dataLiq: number }[]): number[] {
  const datas = new Array<number>(rows.length);
  if (bols.length === 1) { for (let i = 0; i < rows.length; i++) datas[i] = bols[0].dataLiq; return datas; }
  const disp = bols.slice().sort((a, b) => a.dataLiq - b.dataLiq);
  const usados: boolean[] = [];
  const ordem = rows.map((_, i) => i).sort((a, b) => (rows[a].venc || 0) - (rows[b].venc || 0));
  ordem.forEach((i) => {
    const alvo = rows[i].valor; let escolhido = -1;
    for (let j = 0; j < disp.length; j++) if (!usados[j] && disp[j].nominal === alvo) { escolhido = j; break; }
    if (escolhido < 0) for (let j = 0; j < disp.length; j++) if (!usados[j]) { escolhido = j; break; }
    if (escolhido >= 0) { usados[escolhido] = true; datas[i] = disp[escolhido].dataLiq; }
    else datas[i] = disp[disp.length - 1].dataLiq;
  });
  return datas;
}

// ----------------------------- helpers -----------------------------
function normNF(v: string | number): string {
  let s = String(v == null ? "" : v).trim();
  if (s.endsWith(".0")) s = s.slice(0, -2);
  return s;
}

function toCents(v: string | number): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Math.round(v * 100);
  let s = String(v).replace(/R\$/g, "").replace(/\s/g, "");
  if (s.indexOf(",") >= 0 && s.indexOf(".") >= 0) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.indexOf(",") >= 0) s = s.replace(",", ".");
  const n = Number(s);
  return isNaN(n) ? null : Math.round(n * 100);
}

/** célula de data (número serial do Excel, ou "dd/mm/aaaa", ou "aaaa-mm-dd") -> serial Excel. */
function toSerial(v: string | number): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Math.round(v);
  const s = String(v).trim();
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return dateToSerial(+m[3], +m[2], +m[1]);
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return dateToSerial(+m[1], +m[2], +m[3]);
  return null;
}

function dateToSerial(y: number, mo: number, d: number): number {
  return Math.round((Date.UTC(y, mo - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
}
