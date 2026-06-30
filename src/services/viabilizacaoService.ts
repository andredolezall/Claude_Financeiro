/**
 * viabilizacaoService.ts — Orquestra a viabilização de oportunidade e a decisão do dono.
 *
 * (1) gerarBriefViabilizacao: monta o brief do DG (restrições, opções, recomendação,
 *     projeção, valor estratégico) a partir do dado real do tenant. Gating: dg_consultor
 *     full (Pro+), pois é consultoria estratégica do DG.
 * (2) registrarDecisao: o dono decide; gravamos no histórico do lead E emitimos um sinal
 *     para a base — "me avise o que decidir para eu fortalecer nossa base". Só a versão
 *     agregada/anonimizada cruza fronteiras (Regra nº 7), via consolidarAprendizados.
 */

import { requireFeature, FeatureLockedError } from '../core/entitlements.js';
import { computeKPIs } from '../core/finance.js';
import { gerarBrief, type BriefViabilizacao } from '../dg/viabilizacao.js';
import { estimarCapacidadeMensal } from './crmService.js';
import { runLearningJob, learningsToChunks, type TenantSignal } from '../learning/anonymization.js';
import { KnowledgeBase } from '../dg/rag.js';
import { MemoryStore } from '../store/memoryStore.js';
import type { Lead } from '../core/types.js';

const CUSTO_VARIAVEL_PADRAO = 0.6; // premissa default (a calibrar por tenant — Regra nº 1)

function getLead(store: MemoryStore, tenantId: string, leadId: string): Lead {
  const lead = store.listLeads(tenantId).find((l) => l.id === leadId);
  if (!lead) throw new Error(`Lead não encontrado: ${leadId}`);
  return lead;
}

export interface BriefOptions {
  setorTicketMedioR$?: number;
  saldoInicial?: number;
}

/** Gera o brief de viabilização do DG para uma oportunidade. Exige dg_consultor full. */
export function gerarBriefViabilizacao(
  store: MemoryStore,
  tenantId: string,
  leadId: string,
  now: Date,
  opts?: BriefOptions,
): BriefViabilizacao {
  const tenant = store.getTenant(tenantId);
  if (!tenant) throw new Error(`Tenant inexistente: ${tenantId}`);
  requireFeature(tenant.plano, 'dg_consultor', 'full'); // Starter (limited) não tem

  const lead = getLead(store, tenantId, leadId);
  const kpis = computeKPIs(store.listTransactions(tenantId), store.listReceivables(tenantId), store.listPayables(tenantId), now, opts?.saldoInicial ?? 0);
  const capacidade = tenant.capacidadeMensalInformadaR$ ?? estimarCapacidadeMensal(store, tenantId);

  return gerarBrief({
    lead,
    capacidadeMensalR$: capacidade,
    saldoAtualR$: kpis.saldoAtual,
    custoVariavelPct: tenant.custoVariavelPct ?? CUSTO_VARIAVEL_PADRAO,
    setorTicketMedioR$: opts?.setorTicketMedioR$,
  });
}

export type ResultadoDecisao = 'ganho' | 'perdido' | 'pendente';

export interface DecisaoOutcome {
  lead: Lead;
  sinalRegistrado: boolean;
  consentido: boolean;
}

/**
 * O dono decidiu. Grava no histórico do lead e emite um sinal de aprendizado.
 * O sinal só será USADO na base compartilhada se o tenant consentir e o job de
 * consolidação aprovar (consentimento + scrub de PII + limiar N≥X).
 */
export function registrarDecisao(
  store: MemoryStore,
  tenantId: string,
  leadId: string,
  opcaoEscolhida: string,
  resultado: ResultadoDecisao,
  now: Date,
  observacao?: string,
): DecisaoOutcome {
  const tenant = store.getTenant(tenantId);
  if (!tenant) throw new Error(`Tenant inexistente: ${tenantId}`);
  const lead = getLead(store, tenantId, leadId);

  lead.historico.push({
    data: now.toISOString().slice(0, 10),
    nota: `Decisão de viabilização: opção ${opcaoEscolhida} (resultado: ${resultado})${observacao ? ` — ${observacao}` : ''}`,
  });

  // Sinal para a base: padrão genérico (setor + opção + resultado), sem PII identificável.
  // funcionou = true só quando a oportunidade foi efetivamente ganha.
  const sinal: TenantSignal = {
    tenantId,
    setor: tenant.setor,
    faixa: tenant.faixaFaturamento,
    observacao: `oportunidade acima da capacidade: viabilizar via opção ${opcaoEscolhida} ${resultado === 'ganho' ? 'converteu o negócio' : `teve resultado ${resultado}`}`,
    funcionou: resultado === 'ganho',
    consentido: tenant.consenteAprendizadoAgregado,
  };
  store.addSignal(sinal);

  return { lead, sinalRegistrado: true, consentido: tenant.consenteAprendizadoAgregado };
}

export interface ConsolidacaoResultado {
  sinaisConsiderados: number;
  padroesPublicados: number;
}

/**
 * Job offline (PROMPT MESTRE 5.4): consolida os sinais de TODOS os tenants em
 * aprendizados anonimizados e agregados, e os injeta na coleção interna do RAG.
 * Todas as travas (consentimento, scrub de PII, limiar N≥MIN_TENANTS) são aplicadas
 * por runLearningJob — nenhum dado bruto de um tenant chega a outro.
 */
export function consolidarAprendizados(store: MemoryStore, kb: KnowledgeBase): ConsolidacaoResultado {
  const sinais = store.listAllSignals();
  const aprendizados = runLearningJob(sinais);
  kb.addMany(learningsToChunks(aprendizados));
  return { sinaisConsiderados: sinais.length, padroesPublicados: aprendizados.length };
}

export { FeatureLockedError };
