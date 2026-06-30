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
import type { Lead, PerfilRisco } from '../core/types.js';

const CUSTO_VARIAVEL_PADRAO = 0.6; // premissa default (a calibrar por tenant — Regra nº 1)

export interface PerfilRiscoInferido {
  perfil: PerfilRisco;
  motivo: string;
  origem: 'informado' | 'inferido';
}

/**
 * Infere o apetite de risco da empresa a partir do COMPORTAMENTO (dinâmico por cliente):
 *  - folga de caixa (saldo ÷ saída média mensal): pouca folga → conservador;
 *  - histórico de decisões: ousadias que deram certo → arrojado; perdas/recusas → conservador.
 * Se o dono informou tenant.perfilRisco, esse vence.
 */
export function inferirPerfilRisco(store: MemoryStore, tenantId: string, now: Date): PerfilRiscoInferido {
  const tenant = store.getTenant(tenantId);
  if (!tenant) throw new Error(`Tenant inexistente: ${tenantId}`);
  if (tenant.perfilRisco) {
    return { perfil: tenant.perfilRisco, motivo: 'perfil informado pelo dono', origem: 'informado' };
  }
  const txns = store.listTransactions(tenantId);
  const kpis = computeKPIs(txns, store.listReceivables(tenantId), store.listPayables(tenantId), now, 0);
  const despesas = txns.filter((t) => t.kind === 'despesa');
  const meses = new Set(despesas.map((t) => t.data.slice(0, 7))).size || 1;
  const saidaMedia = despesas.reduce((s, t) => s + t.valor, 0) / meses;
  const folga = saidaMedia > 0 ? kpis.saldoAtual / saidaMedia : kpis.saldoAtual > 0 ? 3 : 0;

  const sinais = store.listSignals(tenantId);
  const ousadiasOk = sinais.filter((s) => /opção A/.test(s.observacao) && s.funcionou).length;
  const perdas = sinais.filter((s) => !s.funcionou).length;

  let score = 0;
  const motivos: string[] = [];
  if (folga < 1) { score -= 1; motivos.push(`caixa apertado (folga ${folga.toFixed(1)}x a saída média)`); }
  else if (folga >= 3) { score += 1; motivos.push(`caixa folgado (${folga.toFixed(1)}x a saída média)`); }
  else motivos.push(`caixa equilibrado (${folga.toFixed(1)}x a saída média)`);
  if (ousadiasOk > perdas) { score += 1; motivos.push('histórico de ousadias que deram certo'); }
  else if (perdas > ousadiasOk) { score -= 1; motivos.push('histórico de decisões arriscadas que não converteram'); }

  const perfil: PerfilRisco = score <= -1 ? 'conservador' : score >= 1 ? 'arrojado' : 'equilibrado';
  return { perfil, motivo: motivos.join('; '), origem: 'inferido' };
}

function getLead(store: MemoryStore, tenantId: string, leadId: string): Lead {
  const lead = store.listLeads(tenantId).find((l) => l.id === leadId);
  if (!lead) throw new Error(`Lead não encontrado: ${leadId}`);
  return lead;
}

export interface BriefOptions {
  setorTicketMedioR$?: number;
  saldoInicial?: number;
  /** Sobrescreve o prazo do cliente (dias); senão usa lead.prazoEntregaDias. */
  prazoEntregaDias?: number;
  /** Sobrescreve o perfil de risco (senão usa o informado/inferido). */
  perfilRiscoOverride?: PerfilRisco;
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
  const perfil = opts?.perfilRiscoOverride ?? inferirPerfilRisco(store, tenantId, now).perfil;

  return gerarBrief({
    lead,
    capacidadeMensalR$: capacidade,
    saldoAtualR$: kpis.saldoAtual,
    custoVariavelPct: tenant.custoVariavelPct ?? CUSTO_VARIAVEL_PADRAO,
    perfilRisco: perfil,
    setorTicketMedioR$: opts?.setorTicketMedioR$,
    prazoEntregaDias: opts?.prazoEntregaDias,
    // Ciclo de entrega aprendido da conversa com ESTE cliente (fiel à operação dele).
    cicloEntregaDias: tenant.cicloEntregaDias,
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
