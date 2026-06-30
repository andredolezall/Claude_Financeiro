/**
 * acompanhamentoService.ts — Fecha o arco "Do Diagnóstico ao Lucro" (PROMPT MESTRE 5.6).
 *
 * Conduz a jornada de Orientação → Plano de ação → Acompanhamento → Resultado:
 *  - O DG cobra a execução do plano (não some — valor Comprometimento).
 *  - Marca ações como concluídas.
 *  - MEDE o antes/depois (linha de base × diagnóstico atual) e mostra o ganho real,
 *    gerando o "case" de ROI (meta dos 90 dias). Depois reinicia o ciclo num patamar melhor.
 *
 * Transições são guardadas por etapa (falha cedo se chamadas fora de ordem).
 */

import { advance, restartCycle, type JourneyStage, type JourneyState } from '../core/journey.js';
import { diagnosticar, impactoTotal } from '../dg/diagnostico.js';
import { MemoryStore } from '../store/memoryStore.js';

const brl = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const round2 = (v: number) => Math.round(v * 100) / 100;

class StageError extends Error {}

function requireStage(j: JourneyState, esperado: JourneyStage): void {
  if (j.stage !== esperado) {
    throw new StageError(`Ação exige etapa "${esperado}", mas a jornada está em "${j.stage}".`);
  }
}

/** Orientação → Plano de ação: o dono concordou com o que precisa mudar. */
export function confirmarOrientacao(store: MemoryStore, tenantId: string, now: Date): JourneyState {
  const j = store.getJourney(tenantId);
  requireStage(j, 'orientacao');
  const next = advance(j, 'Dono concordou com a orientação; plano confirmado', now.toISOString());
  store.setJourney(next);
  return next;
}

/** Plano de ação → Acompanhamento: começa a execução. */
export function iniciarExecucao(store: MemoryStore, tenantId: string, now: Date): JourneyState {
  const j = store.getJourney(tenantId);
  requireStage(j, 'plano_de_acao');
  if (!j.plano.length) throw new StageError('Não há plano de ação para executar.');
  const next = advance(j, 'Execução do plano iniciada', now.toISOString());
  store.setJourney(next);
  return next;
}

/** Marca uma ação do plano como concluída (durante o acompanhamento). */
export function concluirAcao(store: MemoryStore, tenantId: string, planoItemId: string, now: Date): JourneyState {
  const j = store.getJourney(tenantId);
  const item = j.plano.find((p) => p.id === planoItemId);
  if (!item) throw new StageError(`Ação não encontrada no plano: ${planoItemId}`);
  const plano = j.plano.map((p) => (p.id === planoItemId ? { ...p, status: 'concluido' as const } : p));
  const next = { ...j, plano, atualizadoEm: now.toISOString() };
  store.setJourney(next);
  return next;
}

export interface ProgressoPlano {
  total: number;
  concluidos: number;
  pendentes: number;
  pct: number;
  proximoPrazo: string | null;
  proximaAcao: string | null;
}

/** Visão de progresso do plano (para o dashboard e para o DG cobrar). */
export function progressoPlano(store: MemoryStore, tenantId: string): ProgressoPlano {
  const j = store.getJourney(tenantId);
  const total = j.plano.length;
  const concluidos = j.plano.filter((p) => p.status === 'concluido').length;
  const pendentesArr = [...j.plano.filter((p) => p.status !== 'concluido')].sort(
    (a, b) => new Date(a.prazo).getTime() - new Date(b.prazo).getTime(),
  );
  return {
    total,
    concluidos,
    pendentes: pendentesArr.length,
    pct: total ? Math.round((concluidos / total) * 100) : 0,
    proximoPrazo: pendentesArr[0]?.prazo ?? null,
    proximaAcao: pendentesArr[0]?.acao ?? null,
  };
}

export interface LembreteExecucao {
  planoItemId: string;
  acao: string;
  prazo: string;
  atrasada: boolean;
  mensagem: string;
}

/** O DG cobra a execução: lembretes de ações pendentes (vencendo em <=2 dias ou atrasadas). */
export function lembretesDeExecucao(store: MemoryStore, tenantId: string, now: Date): LembreteExecucao[] {
  const j = store.getJourney(tenantId);
  const limite = new Date(now.getTime() + 2 * 86_400_000);
  return j.plano
    .filter((p) => p.status !== 'concluido' && new Date(p.prazo) <= limite)
    .sort((a, b) => b.impactoEstimadoR$ - a.impactoEstimadoR$)
    .map((p) => {
      const atrasada = new Date(p.prazo) < new Date(now.toISOString().slice(0, 10));
      return {
        planoItemId: p.id,
        acao: p.acao,
        prazo: p.prazo,
        atrasada,
        mensagem: atrasada
          ? `Essa ação passou do prazo (${p.prazo}) e vale ~${brl(p.impactoEstimadoR$)}/mês: "${p.acao}". Vamos destravar hoje?`
          : `Lembrete: "${p.acao}" vence em ${p.prazo} (impacto ~${brl(p.impactoEstimadoR$)}/mês). Conseguimos avançar?`,
      };
    });
}

export interface ResultadoMedido {
  antesR$: number;
  depoisR$: number;
  ganhoMensalR$: number;
  pctReducao: number;
  etapaJornada: JourneyStage;
  case: string;
}

/**
 * Acompanhamento → Resultado: compara a linha de base (impacto no início do ciclo)
 * com o diagnóstico ATUAL e mostra o ganho real. Gera o "case" e reinicia o ciclo
 * (otimização contínua). Os números vêm do dado — não há invenção (Regra nº 1).
 */
export function medirResultado(
  store: MemoryStore,
  tenantId: string,
  now: Date,
  opts?: { margemPerdidaPorFaltaConciliacao?: number; saldoInicial?: number; reiniciarCiclo?: boolean },
): ResultadoMedido {
  const j = store.getJourney(tenantId);
  requireStage(j, 'acompanhamento');

  const antes = j.baselineImpactoR$ ?? impactoTotal(
    j.diagnosticos.map((d) => ({ chave: '', problema: d.problema, impactoMensalR$: d.impactoMensalR$, base: 'medido', fonte: d.fonte, gravidade: 'media', recomendacao: '' })),
  );
  const findingsAgora = diagnosticar({
    txns: store.listTransactions(tenantId),
    receivables: store.listReceivables(tenantId),
    payables: store.listPayables(tenantId),
    now,
    saldoInicial: opts?.saldoInicial,
    margemPerdidaPorFaltaConciliacao: opts?.margemPerdidaPorFaltaConciliacao,
  });
  const depois = impactoTotal(findingsAgora);
  const ganho = round2(Math.max(0, antes - depois));
  const pctReducao = antes > 0 ? Math.round((ganho / antes) * 100) : 0;

  let next: JourneyState = {
    ...j,
    resultado: { antesR$: antes, depoisR$: depois, ganhoMensalR$: ganho, medidoEm: now.toISOString() },
  };
  // Avança para Resultado e, por padrão, reinicia o ciclo num patamar melhor.
  next = advance(next, `Resultado medido: ganho ~${brl(ganho)}/mês`, now.toISOString());
  if (opts?.reiniciarCiclo !== false) {
    next = restartCycle(next, `ganho de ${brl(ganho)}/mês consolidado`, now.toISOString());
  }
  store.setJourney(next);

  const caseTxt =
    `Antes: ${brl(antes)}/mês drenados. Depois: ${brl(depois)}/mês. ` +
    `Ganho recuperado: ${brl(ganho)}/mês (${pctReducao}% de redução do vazamento).`;
  return { antesR$: antes, depoisR$: depois, ganhoMensalR$: ganho, pctReducao, etapaJornada: next.stage, case: caseTxt };
}
