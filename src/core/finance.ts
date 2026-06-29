/**
 * finance.ts — KPIs e projeção de caixa por tenant.
 *
 * Alimenta o dashboard (entra/sai/sobra, recebíveis em aberto, previsão de caixa)
 * e o motor de notificações (alertas de caixa). PROMPT MESTRE 7 (portal/dashboard).
 */

import type { Payable, Receivable, Transaction } from './types.js';

export interface KPIs {
  entrouMes: number;
  saiuMes: number;
  sobrouMes: number;
  saldoAtual: number;
  recebiveisAbertos: number;
  recebiveisAtrasados: number;
  contasAPagarProximas: number;
}

function sameMonth(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return d.getUTCFullYear() === ref.getUTCFullYear() && d.getUTCMonth() === ref.getUTCMonth();
}

export function computeKPIs(
  txns: Transaction[],
  receivables: Receivable[],
  payables: Payable[],
  now: Date,
  saldoInicial = 0,
): KPIs {
  const entrouMes = txns
    .filter((t) => t.kind === 'receita' && sameMonth(t.data, now))
    .reduce((s, t) => s + t.valor, 0);
  const saiuMes = txns
    .filter((t) => t.kind === 'despesa' && sameMonth(t.data, now))
    .reduce((s, t) => s + t.valor, 0);
  const saldoAtual = saldoInicial + txns.reduce((s, t) => s + (t.kind === 'receita' ? t.valor : -t.valor), 0);
  const recebiveisAbertos = receivables.filter((r) => r.status === 'aberto').reduce((s, r) => s + r.valor, 0);
  const recebiveisAtrasados = receivables.filter((r) => r.status === 'atrasado').reduce((s, r) => s + r.valor, 0);
  const in7 = new Date(now.getTime() + 7 * 86_400_000);
  const contasAPagarProximas = payables
    .filter((p) => p.status === 'aberto' && new Date(p.vencimento) <= in7)
    .reduce((s, p) => s + p.valor, 0);
  return {
    entrouMes, saiuMes, sobrouMes: entrouMes - saiuMes, saldoAtual,
    recebiveisAbertos, recebiveisAtrasados, contasAPagarProximas,
  };
}

export interface CashProjectionDay {
  data: string; // ISO date
  saldoProjetado: number;
}

/**
 * Projeção de caixa simples para os próximos `dias`: parte do saldo atual e aplica
 * recebíveis (entradas previstas) e contas a pagar (saídas previstas) por data.
 * Detecta o primeiro dia de caixa negativo (insumo do alerta proativo).
 */
export function projectCash(
  saldoAtual: number,
  receivables: Receivable[],
  payables: Payable[],
  now: Date,
  dias = 30,
): { serie: CashProjectionDay[]; primeiroDiaNegativo: string | null } {
  const serie: CashProjectionDay[] = [];
  let saldo = saldoAtual;
  let primeiroDiaNegativo: string | null = null;
  for (let i = 0; i <= dias; i++) {
    const dia = new Date(now.getTime() + i * 86_400_000);
    const diaIso = dia.toISOString().slice(0, 10);
    const entradas = receivables
      .filter((r) => r.status !== 'recebido' && r.status !== 'cancelado' && r.vencimento.slice(0, 10) === diaIso)
      .reduce((s, r) => s + r.valor, 0);
    const saidas = payables
      .filter((p) => p.status !== 'pago' && p.vencimento.slice(0, 10) === diaIso)
      .reduce((s, p) => s + p.valor, 0);
    saldo += entradas - saidas;
    if (saldo < 0 && primeiroDiaNegativo === null) primeiroDiaNegativo = diaIso;
    serie.push({ data: diaIso, saldoProjetado: Math.round(saldo * 100) / 100 });
  }
  return { serie, primeiroDiaNegativo };
}
