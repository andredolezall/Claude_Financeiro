/**
 * PreencherCR — Office Script (Excel na web → Automatizar).
 *
 * Grava PAGO? = "S" e DATA RECEBIMENTO na aba "CR - Contas a Receber", a partir das
 * linhas conciliadas pelo Conciliador (web/). Preserva pivôs, gráficos e DRE — escreve
 * só nas células de PAGO?/DATA das linhas casadas e em branco.
 *
 * Fluxo:
 *   1. Cole o CSV do Conciliador na aba "Conciliação Entrada" (Dados → Texto para colunas,
 *      separador ';', ou use o Power Automate para popular essa aba).
 *   2. Rode este script (Automatizar → PreencherCR).
 *   3. Resultado: CR preenchida; itens DECIDIR copiados para "Conciliação Revisar";
 *      resumo no retorno (visível no Power Automate) e em console.
 *
 * Casamento: NF + VALOR NOMINAL; FIFO por vencimento; só linhas com PAGO? vazio.
 */

const CR_SHEET = "CR - Contas a Receber";
const ENTRADA = "Conciliação Entrada";
const REVISAR = "Conciliação Revisar";

function main(workbook: ExcelScript.Workbook): string {
  const entrada = workbook.getWorksheet(ENTRADA);
  if (!entrada) return `ERRO: crie a aba "${ENTRADA}" e cole nela o CSV do Conciliador.`;
  const cr = workbook.getWorksheet(CR_SHEET);
  if (!cr) return `ERRO: aba "${CR_SHEET}" não encontrada.`;

  // ---------- lê a entrada (CSV do conciliador) ----------
  const eVals = entrada.getUsedRange().getValues();
  if (eVals.length < 2) return "ERRO: aba de entrada vazia.";
  const eHead = (eVals[0] as (string | number)[]).map((h) => String(h).trim());
  const eIdx = (n: string) => eHead.indexOf(n);
  const ecAcao = eIdx("AÇÃO"), ecNF = eIdx("NF"), ecVal = eIdx("VALOR NOMINAL"), ecData = eIdx("DATA RECEBIMENTO");
  if (ecAcao < 0 || ecNF < 0 || ecVal < 0 || ecData < 0)
    return "ERRO: cabeçalho da entrada precisa de AÇÃO, NF, VALOR NOMINAL, DATA RECEBIMENTO.";

  type Fill = { nf: string; valor: number; serial: number };
  const fills: Fill[] = [];
  const decidir: (string | number | boolean)[][] = [];
  for (let i = 1; i < eVals.length; i++) {
    const row = eVals[i] as (string | number)[];
    const acao = String(row[ecAcao] || "").trim().toUpperCase();
    if (acao === "PREENCHER") {
      const serial = brToSerial(row[ecData]);
      const valor = toCents(row[ecVal]);
      const nf = normNF(row[ecNF]);
      if (nf && valor != null && serial != null) fills.push({ nf, valor, serial });
    } else if (acao === "DECIDIR") {
      decidir.push(row);
    }
  }

  // ---------- indexa linhas em branco da CR por (NF|valor) ----------
  const crRange = cr.getUsedRange();
  const crVals = crRange.getValues();
  const base = crRange.getRowIndex();
  const baseCol = crRange.getColumnIndex();
  const cHead = (crVals[0] as (string | number)[]).map((h) => String(h).trim());
  const ci = (n: string) => cHead.indexOf(n);
  const cNF = ci("NF"), cValor = ci("VALOR TOTAL"), cPago = ci("PAGO?"), cData = ci("DATA RECEBIMENTO"), cVenc = ci("VENCIMENTO");
  if ([cNF, cValor, cPago, cData, cVenc].some((x) => x < 0))
    return "ERRO: na CR faltou alguma coluna (NF, VALOR TOTAL, PAGO?, DATA RECEBIMENTO, VENCIMENTO).";

  const blanks: { [key: string]: number[] } = {};
  for (let i = 1; i < crVals.length; i++) {
    if (String(crVals[i][cPago] || "").trim().toUpperCase() === "S") continue;
    const nf = normNF(crVals[i][cNF]);
    const val = toCents(crVals[i][cValor]);
    if (!nf || val == null) continue;
    const key = nf + "|" + val;
    (blanks[key] = blanks[key] || []).push(i);
  }
  for (const k of Object.keys(blanks))
    blanks[k].sort((a, b) => serialOf(crVals[a][cVenc]) - serialOf(crVals[b][cVenc])); // FIFO

  // ---------- aplica os preenchimentos ----------
  let gravados = 0;
  const naoEncontrados: string[] = [];
  for (const f of fills) {
    const fila = blanks[f.nf + "|" + f.valor];
    if (!fila || fila.length === 0) { naoEncontrados.push(`NF ${f.nf} (${(f.valor / 100).toFixed(2)})`); continue; }
    const i = fila.shift() as number;            // linha mais antiga em branco
    const r = base + i;
    cr.getRangeByIndexes(r, baseCol + cPago, 1, 1).setValue("S");
    const dcell = cr.getRangeByIndexes(r, baseCol + cData, 1, 1);
    dcell.setValue(f.serial);
    dcell.setNumberFormat("dd/mm/yyyy");
    gravados++;
  }

  // ---------- copia os DECIDIR para a aba de revisão ----------
  let rev = workbook.getWorksheet(REVISAR);
  if (!rev) rev = workbook.addWorksheet(REVISAR);
  rev.getUsedRange()?.clear(ExcelScript.ClearApplyTo.contents);
  const saida = [eHead].concat(decidir.map((r) => r.map((c) => (c == null ? "" : c)))) as (string | number | boolean)[][];
  if (saida.length > 0)
    rev.getRangeByIndexes(0, 0, saida.length, eHead.length).setValues(saida);

  const resumo =
    `OK: ${gravados} linha(s) preenchida(s) na CR; ${decidir.length} para DECIDIR (aba ${REVISAR}); ` +
    `${naoEncontrados.length} não encontrada(s).` +
    (naoEncontrados.length ? " Ex.: " + naoEncontrados.slice(0, 5).join("; ") : "");
  console.log(resumo);
  return resumo;
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

/** "dd/mm/aaaa" (ou número serial) -> serial Excel. */
function brToSerial(v: string | number): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Math.round(v);
  const m = String(v).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return dateToSerial(+m[3], +m[2], +m[1]);
}

/** serial de uma célula de data já lida da planilha (número) ou texto. */
function serialOf(v: string | number): number {
  if (typeof v === "number") return v;
  const s = brToSerial(v);
  return s == null ? 0 : s;
}

function dateToSerial(y: number, mo: number, d: number): number {
  const ms = Date.UTC(y, mo - 1, d) - Date.UTC(1899, 11, 30);
  return Math.round(ms / 86400000);
}
