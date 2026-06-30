/**
 * conciliacao.ts — Conciliação automática de recebíveis.
 *
 * Materializa a promessa central da DGR: "eliminamos divergências de recebíveis em
 * até 30 dias". Casa transações de RECEITA (dinheiro que entrou) com RECEBÍVEIS em
 * aberto (dinheiro esperado), dá baixa nos que batem e expõe as divergências.
 *
 * Funções puras e testáveis (sem I/O). O gating por plano (manual-assistida ×
 * automática × +régua) é aplicado por applyConciliacao, abaixo.
 */

import type { Receivable, Transaction } from './types.js';

/** Normaliza nome de contraparte para comparar (minúsculo, sem acento, sem ruído). */
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Duas contrapartes "casam" se uma contém a outra (tolera "Maria" × "Maria Silva"). */
function namesMatch(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

export type MatchConfidence = 'alta' | 'media';

export interface ConciliationMatch {
  receivable: Receivable;
  transaction: Transaction;
  confidence: MatchConfidence;
}

export interface ConciliationResult {
  /** Recebíveis que casaram com uma receita (candidatos a baixa). */
  matches: ConciliationMatch[];
  /** Recebíveis em aberto sem receita correspondente (cobrar). */
  recebiveisEmAberto: Receivable[];
  /** Receitas sem recebível correspondente (entrada não esperada / sem registro). */
  receitasSemRecebivel: Transaction[];
}

/** Tolerância de valor (centavos) para considerar que dois valores são o mesmo. */
const VALOR_TOLERANCIA = 0.01;
/** Janela máxima (dias) entre vencimento e a entrada para casar com confiança. */
const JANELA_DIAS = 45;

function diffDias(aIso: string, bIso: string): number {
  return Math.abs(new Date(aIso).getTime() - new Date(bIso).getTime()) / 86_400_000;
}

/**
 * Concilia receitas × recebíveis. Cada receita é usada no máximo uma vez. Prioriza
 * o casamento por (contraparte + valor); a proximidade de data eleva a confiança.
 */
export function conciliarRecebiveis(
  receitas: Transaction[],
  receivables: Receivable[],
): ConciliationResult {
  const abertos = receivables.filter((r) => r.status === 'aberto' || r.status === 'atrasado');
  const receitasDisponiveis = receitas.filter((t) => t.kind === 'receita');
  const usadas = new Set<string>();
  const matches: ConciliationMatch[] = [];
  const recebiveisEmAberto: Receivable[] = [];

  for (const r of abertos) {
    // Candidatas: valor igual (dentro da tolerância) e receita ainda não usada.
    const candidatas = receitasDisponiveis
      .filter((t) => !usadas.has(t.id) && Math.abs(t.valor - r.valor) <= VALOR_TOLERANCIA)
      .sort((a, b) => diffDias(a.data, r.vencimento) - diffDias(b.data, r.vencimento));

    // Preferir candidata com nome batendo; senão, a mais próxima da data.
    const porNome = candidatas.find((t) => namesMatch(t.contraparte, r.contraparte));
    const escolhida = porNome ?? candidatas[0];

    if (escolhida) {
      const nomeBate = namesMatch(escolhida.contraparte, r.contraparte);
      const dataBate = diffDias(escolhida.data, r.vencimento) <= JANELA_DIAS;
      // Alta confiança só quando nome casa E a data é plausível.
      const confidence: MatchConfidence = nomeBate && dataBate ? 'alta' : 'media';
      usadas.add(escolhida.id);
      matches.push({ receivable: r, transaction: escolhida, confidence });
    } else {
      recebiveisEmAberto.push(r);
    }
  }

  const receitasSemRecebivel = receitasDisponiveis.filter((t) => !usadas.has(t.id));
  return { matches, recebiveisEmAberto, receitasSemRecebivel };
}
