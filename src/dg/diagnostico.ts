/**
 * diagnostico.ts — Motor de diagnóstico do DG (o coração da consultoria).
 *
 * PROMPT MESTRE 5.6 (passo 1) + Regra nº 8: o DG investiga o dado real do tenant,
 * MOSTRA o que está drenando resultado e QUANTIFICA o impacto em R$/mês.
 *
 * Princípio (Regra nº 1 — zero suposição): a quantificação é DETERMINÍSTICA, por
 * fórmulas transparentes sobre o dado real. Cada achado declara se o impacto é
 * `medido` (calculado do dado) ou `estimado` (benchmark a validar) e cita a base.
 * O DG apenas NARRA isso de forma didática — nunca inventa número.
 */

import { computeKPIs, projectCash } from '../core/finance.js';
import { conciliarRecebiveis } from '../core/conciliacao.js';
import type { Payable, Receivable, Transaction } from '../core/types.js';

export type Gravidade = 'alta' | 'media' | 'baixa';

export interface Finding {
  chave: string;
  problema: string;
  /** Impacto mensal estimado no resultado, em R$ (0 quando puramente qualitativo). */
  impactoMensalR$: number;
  /** `medido` = calculado do dado real; `estimado` = benchmark/assunção a validar. */
  base: 'medido' | 'estimado';
  fonte: string;
  gravidade: Gravidade;
  recomendacao: string;
}

export interface DiagnosticoInput {
  txns: Transaction[];
  receivables: Receivable[];
  payables: Payable[];
  now: Date;
  saldoInicial?: number;
  /**
   * Percentual de margem perdida por falta de conciliação (faixa do plano DGR: 8–15%).
   * É benchmark a validar — por isso achados que o usam são marcados `estimado`.
   */
  margemPerdidaPorFaltaConciliacao?: number;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Recebíveis em atraso = capital parado que já deveria estar no caixa. */
function detectAtrasados(input: DiagnosticoInput): Finding | null {
  const atrasados = input.receivables.filter((r) => r.status === 'atrasado');
  if (!atrasados.length) return null;
  const total = round2(atrasados.reduce((s, r) => s + r.valor, 0));
  return {
    chave: 'recebiveis_atrasados',
    problema: `${atrasados.length} recebível(is) em atraso somando R$ ${total.toLocaleString('pt-BR')} — dinheiro seu parado fora do caixa.`,
    impactoMensalR$: total,
    base: 'medido',
    fonte: 'Dado do tenant (recebíveis com status atrasado)',
    gravidade: total > 0 ? 'alta' : 'media',
    recomendacao: 'Ativar régua de cobrança (lembrete antes, no dia e após) para puxar esse dinheiro de volta ao caixa.',
  };
}

/** Divergência de conciliação: entradas sem recebível e recebíveis sem baixa. */
function detectDivergenciaConciliacao(input: DiagnosticoInput): Finding | null {
  const { matches, recebiveisEmAberto, receitasSemRecebivel } = conciliarRecebiveis(input.txns, input.receivables);
  // Divergência real exige AMBOS: entrada não casada E recebível esperado sem baixa
  // (entrou dinheiro e há valor esperado, mas não batem → risco de cobrança duplicada/perdida).
  // Venda à vista (receita sem recebível, sem recebíveis em aberto) NÃO é divergência.
  if (receitasSemRecebivel.length === 0 || recebiveisEmAberto.length === 0) return null;
  const divergencias = receitasSemRecebivel.length + recebiveisEmAberto.length;
  // Volume sob risco = recebíveis sem baixa (esperado e não conciliado).
  const volumeSobRisco = round2(recebiveisEmAberto.reduce((s, r) => s + r.valor, 0));
  const pct = input.margemPerdidaPorFaltaConciliacao ?? 0.08; // piso da faixa 8–15%
  const impacto = round2(volumeSobRisco * pct);
  return {
    chave: 'divergencia_conciliacao',
    problema: `${divergencias} divergência(s) entre o que entrou e o que era esperado (${receitasSemRecebivel.length} entrada(s) sem recebível, ${recebiveisEmAberto.length} recebível(is) sem baixa). Sem conciliação, cobrança duplica ou se perde.`,
    impactoMensalR$: impacto,
    base: 'estimado',
    fonte: `Benchmark do plano DGR: 8–15% de margem perdida por falta de conciliação (a validar). Conciliados automaticamente: ${matches.length}.`,
    gravidade: divergencias >= 3 ? 'alta' : 'media',
    recomendacao: 'Ativar conciliação automática de recebíveis para casar entrada × recebível e eliminar a divergência.',
  };
}

/** Queima de caixa: no mês corrente saiu mais do que entrou. */
function detectQueimaDeCaixa(input: DiagnosticoInput): Finding | null {
  const k = computeKPIs(input.txns, input.receivables, input.payables, input.now, input.saldoInicial ?? 0);
  if (k.sobrouMes >= 0) return null;
  const queima = round2(Math.abs(k.sobrouMes));
  return {
    chave: 'queima_de_caixa',
    problema: `No mês, saiu mais do que entrou: déficit de R$ ${queima.toLocaleString('pt-BR')}. O caixa está encolhendo.`,
    impactoMensalR$: queima,
    base: 'medido',
    fonte: 'Dado do tenant (entradas − saídas do mês corrente)',
    gravidade: 'alta',
    recomendacao: 'Priorizar recebíveis em aberto e revisar despesas de maior peso antes de assumir novos custos.',
  };
}

/** Risco de caixa negativo projetado nos próximos 30 dias. */
function detectRiscoCaixaNegativo(input: DiagnosticoInput): Finding | null {
  const k = computeKPIs(input.txns, input.receivables, input.payables, input.now, input.saldoInicial ?? 0);
  const proj = projectCash(k.saldoAtual, input.receivables, input.payables, input.now, 30);
  if (!proj.primeiroDiaNegativo) return null;
  const pior = round2(Math.min(...proj.serie.map((d) => d.saldoProjetado)));
  return {
    chave: 'risco_caixa_negativo',
    problema: `Projeção aponta caixa negativo a partir de ${proj.primeiroDiaNegativo} (pior saldo previsto: R$ ${pior.toLocaleString('pt-BR')}). Há descasamento entre entradas e saídas.`,
    impactoMensalR$: round2(Math.abs(pior)),
    base: 'medido',
    fonte: 'Projeção de caixa (saldo atual + recebíveis − contas a pagar, 30 dias)',
    gravidade: 'alta',
    recomendacao: 'Antecipar recebíveis ou renegociar uma conta a pagar para fechar o descasamento antes da data.',
  };
}

const DETECTORES = [detectAtrasados, detectDivergenciaConciliacao, detectQueimaDeCaixa, detectRiscoCaixaNegativo];

/**
 * Roda todos os detectores e devolve os achados ordenados por impacto no resultado
 * (Regra nº 8: o que mais drena o caixa aparece primeiro).
 */
export function diagnosticar(input: DiagnosticoInput): Finding[] {
  return DETECTORES.map((d) => d(input))
    .filter((f): f is Finding => f !== null)
    .sort((a, b) => b.impactoMensalR$ - a.impactoMensalR$);
}

/** Impacto total quantificado dos achados (R$/mês). */
export function impactoTotal(findings: Finding[]): number {
  return round2(findings.reduce((s, f) => s + f.impactoMensalR$, 0));
}
