/**
 * journey.ts — Jornada "Do Diagnóstico ao Lucro" como máquina de estados por tenant.
 *
 * PROMPT MESTRE 5.6: materializa o lema da Constituição. O DG conduz cada empresário
 * por essa jornada e SABE SEMPRE em que etapa o cliente está. As etapas espelham o
 * Método Gestão em Resultado™ (ver dgr_constitution.METHOD).
 *
 * Requisitos: persistir o estado por tenant; o DG referencia esse estado em toda
 * interação; cada saída do DG serve ao avanço na jornada e ao critério da Regra nº 8.
 */

export type JourneyStage =
  | 'diagnostico'
  | 'orientacao'
  | 'plano_de_acao'
  | 'acompanhamento'
  | 'resultado';

export interface JourneyStageDef {
  key: JourneyStage;
  ordem: number;
  nome: string;
  metodoEtapa: string; // etapa correspondente do Método Gestão em Resultado™
  objetivo: string;
  /** O que o DG faz nesta etapa (entra no system prompt como foco atual). */
  focoDoDG: string;
  /** Critério objetivo para avançar à próxima etapa. */
  criterioDeAvanco: string;
}

export const JOURNEY_STAGES: readonly JourneyStageDef[] = [
  {
    key: 'diagnostico',
    ordem: 1,
    nome: 'Diagnóstico',
    metodoEtapa: 'Diagnóstico',
    objetivo:
      'Descobrir por que o resultado está sendo drenado. O empresário muitas vezes nem sabe o que está errado.',
    focoDoDG:
      'Investigar caixa, recebíveis, CRM, lançamentos e processos; mostrar de forma clara o que está sendo feito errado e QUANTIFICAR o impacto (quanto custa por mês). Honesto, direto, construtivo, sempre justificando.',
    criterioDeAvanco:
      'Pelo menos 1 problema-raiz identificado e quantificado em R$/mês, validado com o dono.',
  },
  {
    key: 'orientacao',
    ordem: 2,
    nome: 'Orientação',
    metodoEtapa: 'Reestruturação operacional',
    objetivo: 'Explicar o que precisa mudar e por quê, de forma didática.',
    focoDoDG:
      'Traduzir o diagnóstico em entendimento: o que muda, por que muda, ancorado em casos validados (base de conhecimento). Linguagem simples, justificando o conceito.',
    criterioDeAvanco: 'Dono entende e concorda com as mudanças propostas.',
  },
  {
    key: 'plano_de_acao',
    ordem: 3,
    nome: 'Plano de ação',
    metodoEtapa: 'Automação financeira',
    objetivo: 'Transformar o diagnóstico em passos concretos priorizados por impacto no resultado.',
    focoDoDG:
      'Gerar passos com responsável, prazo e métrica de sucesso. O que ataca primeiro é o que mais aproxima do lucro (Regra nº 8). Automatizar o que for repetitivo.',
    criterioDeAvanco: 'Plano com >=1 ação priorizada, com responsável, prazo e métrica definidos.',
  },
  {
    key: 'acompanhamento',
    ordem: 4,
    nome: 'Acompanhamento passo a passo',
    metodoEtapa: 'Monitoramento',
    objetivo: 'Garantir execução. O DG não some.',
    focoDoDG:
      'Cobrar execução, lembrar prazos (WhatsApp/agenda/CRM), revisar o que foi feito, ajustar o plano e celebrar avanço. Persistente até virar realidade.',
    criterioDeAvanco: 'Ações do plano executadas e medidas; impacto começando a aparecer no caixa.',
  },
  {
    key: 'resultado',
    ordem: 5,
    nome: 'Resultado / Lucro',
    metodoEtapa: 'Otimização contínua',
    objetivo: 'Medir o antes/depois e mostrar o ganho real.',
    focoDoDG:
      'Mostrar margem recuperada, caixa estabilizado, recebível conciliado. Partir para otimização contínua, recomeçando o ciclo num patamar melhor.',
    criterioDeAvanco: 'Ganho mensurado; novo ciclo de diagnóstico inicia num patamar superior.',
  },
] as const;

const STAGE_BY_KEY = new Map(JOURNEY_STAGES.map((s) => [s.key, s]));

/** Estado da jornada de um tenant (persistido). */
export interface JourneyState {
  tenantId: string;
  stage: JourneyStage;
  /** Achados de diagnóstico quantificados (a "cagada" que drena resultado). */
  diagnosticos: { problema: string; impactoMensalR$: number; fonte: string }[];
  /** Passos do plano de ação. */
  plano: PlanoAcaoItem[];
  atualizadoEm: string;
  historico: { de: JourneyStage; para: JourneyStage; em: string; motivo: string }[];
}

export interface PlanoAcaoItem {
  id: string;
  acao: string;
  responsavel: string;
  prazo: string; // ISO date
  metricaSucesso: string;
  impactoEstimadoR$: number; // usado para priorizar (Regra nº 8)
  status: 'pendente' | 'em_andamento' | 'concluido';
}

export function getStageDef(stage: JourneyStage): JourneyStageDef {
  const def = STAGE_BY_KEY.get(stage);
  if (!def) throw new Error(`Etapa de jornada desconhecida: ${stage}`);
  return def;
}

export function createJourney(tenantId: string, now: string): JourneyState {
  return {
    tenantId,
    stage: 'diagnostico',
    diagnosticos: [],
    plano: [],
    atualizadoEm: now,
    historico: [],
  };
}

export function nextStage(stage: JourneyStage): JourneyStage | null {
  const def = getStageDef(stage);
  // 'resultado' recomeça o ciclo (otimização contínua) — tratado por restartCycle.
  const next = JOURNEY_STAGES.find((s) => s.ordem === def.ordem + 1);
  return next?.key ?? null;
}

/** Avança a jornada para a próxima etapa, registrando no histórico. */
export function advance(state: JourneyState, motivo: string, now: string): JourneyState {
  const next = nextStage(state.stage);
  if (!next) return restartCycle(state, motivo, now);
  return {
    ...state,
    stage: next,
    atualizadoEm: now,
    historico: [...state.historico, { de: state.stage, para: next, em: now, motivo }],
  };
}

/** Após o Resultado, reinicia o ciclo de diagnóstico num patamar melhor. */
export function restartCycle(state: JourneyState, motivo: string, now: string): JourneyState {
  return {
    ...state,
    stage: 'diagnostico',
    atualizadoEm: now,
    historico: [
      ...state.historico,
      { de: state.stage, para: 'diagnostico', em: now, motivo: `Otimização contínua: ${motivo}` },
    ],
  };
}

/** Ordena o plano por impacto no resultado (Regra nº 8: resultado primeiro). */
export function planoPriorizado(state: JourneyState): PlanoAcaoItem[] {
  return [...state.plano].sort((a, b) => b.impactoEstimadoR$ - a.impactoEstimadoR$);
}

/** Resumo textual da jornada para o DG referenciar em toda interação. */
export function journeySummary(state: JourneyState): string {
  const def = getStageDef(state.stage);
  const pendentes = state.plano.filter((p) => p.status !== 'concluido');
  const totalImpacto = state.diagnosticos.reduce((s, d) => s + d.impactoMensalR$, 0);
  return [
    `Etapa atual da jornada: ${def.ordem}/5 — ${def.nome} (Método: ${def.metodoEtapa}).`,
    `Foco do DG agora: ${def.focoDoDG}`,
    state.diagnosticos.length
      ? `Diagnósticos quantificados: ${state.diagnosticos.length} (impacto somado ~R$ ${totalImpacto.toLocaleString('pt-BR')}/mês).`
      : 'Sem diagnóstico quantificado ainda — prioridade é descobrir e quantificar o problema-raiz.',
    pendentes.length
      ? `Plano: ${pendentes.length} ação(ões) pendente(s). Próxima prioridade: "${planoPriorizado(state).find((p) => p.status !== 'concluido')?.acao ?? '—'}".`
      : 'Sem ações pendentes no plano.',
  ].join('\n');
}
