/**
 * entitlements.ts — Matriz de planos × recursos (gating por tenant).
 *
 * PROMPT MESTRE 7.1: a arquitetura precisa liberar plataformas/recursos por plano.
 * Este módulo é a fonte única de verdade do gating. Sem ele, o modelo comercial
 * não fecha (PROMPT MESTRE 8.2).
 *
 * ⚠️ A distribuição abaixo é a HIPÓTESE do prompt, a validar contra margem ≥ 70%
 *    e CAC payback ≤ 3 meses (ver docs/pesquisa/02_modelos_consultoria_pme.md).
 *    Se um recurso quebrar a unit economics de um plano, realocar e justificar.
 */

import type { PlanKey } from './types.js';

/** Nível de liberação de um recurso por plano. */
export type FeatureLevel = 'none' | 'basic' | 'limited' | 'full' | 'priority';

export type FeatureKey =
  | 'whatsapp_lancamento_texto'
  | 'whatsapp_lancamento_audio'
  | 'dg_consultor'
  | 'dashboard_kpis'
  | 'conciliacao_recebiveis'
  | 'crm_agenda'
  | 'notificacoes_caixa'
  | 'agenda_lembretes_whatsapp'
  | 'open_finance'
  | 'relatorios_recorrentes'
  | 'acompanhamento_consultor_humano';

export interface PlanDefinition {
  key: PlanKey;
  nome: string;
  precoMensal: number; // R$
  /** SLA de primeira resposta, em horas. */
  slaHoras: number;
  onboarding: 'self' | 'assistido' | 'full_automation';
  features: Record<FeatureKey, FeatureLevel>;
}

/** Ordem de força dos níveis (para comparações `>=`). */
const LEVEL_ORDER: FeatureLevel[] = ['none', 'limited', 'basic', 'full', 'priority'];

export const PLANS: Record<PlanKey, PlanDefinition> = {
  starter: {
    key: 'starter',
    nome: 'Starter',
    precoMensal: 397,
    slaHoras: 48,
    onboarding: 'self',
    features: {
      whatsapp_lancamento_texto: 'full',
      whatsapp_lancamento_audio: 'none',
      dg_consultor: 'limited', // FAQ/limitado
      dashboard_kpis: 'basic',
      conciliacao_recebiveis: 'limited', // manual-assistida
      crm_agenda: 'none',
      notificacoes_caixa: 'basic',
      agenda_lembretes_whatsapp: 'none',
      open_finance: 'none',
      relatorios_recorrentes: 'basic', // mensal
      acompanhamento_consultor_humano: 'none',
    },
  },
  pro: {
    key: 'pro',
    nome: 'Pro',
    precoMensal: 897,
    slaHoras: 24,
    onboarding: 'assistido',
    features: {
      whatsapp_lancamento_texto: 'full',
      whatsapp_lancamento_audio: 'full',
      dg_consultor: 'full',
      dashboard_kpis: 'full',
      conciliacao_recebiveis: 'full', // automática
      crm_agenda: 'basic',
      notificacoes_caixa: 'full',
      agenda_lembretes_whatsapp: 'full',
      open_finance: 'limited', // add-on opcional
      relatorios_recorrentes: 'full', // semanal
      acompanhamento_consultor_humano: 'basic', // mensal
    },
  },
  enterprise: {
    key: 'enterprise',
    nome: 'Enterprise',
    precoMensal: 1790,
    slaHoras: 8,
    onboarding: 'full_automation',
    features: {
      whatsapp_lancamento_texto: 'full',
      whatsapp_lancamento_audio: 'full',
      dg_consultor: 'priority',
      dashboard_kpis: 'priority', // customizável
      conciliacao_recebiveis: 'priority', // automática + régua de cobrança
      crm_agenda: 'priority', // completo + sugestão de abordagem
      notificacoes_caixa: 'priority', // proativas
      agenda_lembretes_whatsapp: 'full',
      open_finance: 'full',
      relatorios_recorrentes: 'priority', // sob demanda + semanal
      acompanhamento_consultor_humano: 'priority', // quinzenal/dedicado
    },
  },
};

/** Nível de um recurso para um plano. */
export function featureLevel(plan: PlanKey, feature: FeatureKey): FeatureLevel {
  return PLANS[plan].features[feature];
}

/** O tenant tem ao menos acesso básico ao recurso? */
export function hasFeature(plan: PlanKey, feature: FeatureKey): boolean {
  return featureLevel(plan, feature) !== 'none';
}

/** O nível do recurso é >= ao mínimo exigido? Útil para gates graduais. */
export function meetsLevel(plan: PlanKey, feature: FeatureKey, min: FeatureLevel): boolean {
  return LEVEL_ORDER.indexOf(featureLevel(plan, feature)) >= LEVEL_ORDER.indexOf(min);
}

/** Erro de gating — capturado pela API para responder 402/upgrade. */
export class FeatureLockedError extends Error {
  constructor(
    public readonly feature: FeatureKey,
    public readonly plan: PlanKey,
    public readonly upgradeTo: PlanKey | null,
  ) {
    super(`Recurso "${feature}" não está disponível no plano ${PLANS[plan].nome}.`);
    this.name = 'FeatureLockedError';
  }
}

/** Menor plano que libera o recurso (para sugestão de upgrade). */
export function minPlanFor(feature: FeatureKey, min: FeatureLevel = 'basic'): PlanKey | null {
  const order: PlanKey[] = ['starter', 'pro', 'enterprise'];
  return order.find((p) => meetsLevel(p, feature, min)) ?? null;
}

/** Lança FeatureLockedError se o plano não atinge o nível mínimo do recurso. */
export function requireFeature(
  plan: PlanKey,
  feature: FeatureKey,
  min: FeatureLevel = 'basic',
): void {
  if (!meetsLevel(plan, feature, min)) {
    throw new FeatureLockedError(feature, plan, minPlanFor(feature, min));
  }
}
