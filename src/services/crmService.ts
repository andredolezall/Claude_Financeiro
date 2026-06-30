/**
 * crmService.ts — CRM com agenda inteligente (PROMPT MESTRE 7.2), ligado ao store.
 *
 * Ataca o lado da RECEITA: oportunidades na mesa, follow-ups e — o diferencial —
 * o cruzamento OPORTUNIDADE × CAPACIDADE de entrega (não gerar demanda que o cliente
 * não consegue atender). A sugestão de abordagem do DG vive em crm/crm.ts (gating).
 *
 * Gating (matriz §7.1): crm_agenda → Starter none, Pro basic, Enterprise priority.
 * A lógica de pipeline/capacidade é pura (crm/crm.ts); aqui fazemos I/O no store.
 */

import { requireFeature } from '../core/entitlements.js';
import { assessCapacity, openLeads, pendingFollowUps, pipelineValue, type CapacityAssessment } from '../crm/crm.js';
import { computeKPIs } from '../core/finance.js';
import { MemoryStore, genId } from '../store/memoryStore.js';
import type { AgendaItem, Lead, LeadStage } from '../core/types.js';

export interface NovoLead {
  nome: string;
  contato?: string;
  valorPotencial: number;
  ticketMedio?: number;
  prazoEntregaDias?: number;
  estagio?: LeadStage;
}

/** Cria um lead/oportunidade. Exige plano com CRM (Pro+). */
export function criarLead(store: MemoryStore, tenantId: string, dados: NovoLead, now: Date): Lead {
  const tenant = store.getTenant(tenantId);
  if (!tenant) throw new Error(`Tenant inexistente: ${tenantId}`);
  requireFeature(tenant.plano, 'crm_agenda'); // Starter: lança FeatureLockedError → upsell

  const lead: Lead = {
    id: genId('lead'),
    tenantId,
    nome: dados.nome,
    contato: dados.contato,
    estagio: dados.estagio ?? 'novo',
    valorPotencial: dados.valorPotencial,
    ticketMedio: dados.ticketMedio,
    prazoEntregaDias: dados.prazoEntregaDias,
    historico: [{ data: now.toISOString().slice(0, 10), nota: 'Lead criado' }],
    criadoEm: now.toISOString(),
  };
  return store.addLead(lead);
}

function findLead(store: MemoryStore, tenantId: string, leadId: string): Lead {
  const lead = store.listLeads(tenantId).find((l) => l.id === leadId);
  if (!lead) throw new Error(`Lead não encontrado: ${leadId}`);
  return lead;
}

/** Registra uma interação no histórico do lead. */
export function registrarInteracao(store: MemoryStore, tenantId: string, leadId: string, nota: string, now: Date): Lead {
  const lead = findLead(store, tenantId, leadId);
  lead.historico.push({ data: now.toISOString().slice(0, 10), nota });
  return lead;
}

/** Avança (ou regride) o estágio do lead, registrando no histórico. */
export function avancarEstagio(store: MemoryStore, tenantId: string, leadId: string, estagio: LeadStage, now: Date): Lead {
  const lead = findLead(store, tenantId, leadId);
  const anterior = lead.estagio;
  lead.estagio = estagio;
  lead.historico.push({ data: now.toISOString().slice(0, 10), nota: `Estágio: ${anterior} → ${estagio}` });
  return lead;
}

/** Agenda um follow-up para o lead (vira item de agenda com lembrete). */
export function agendarFollowUp(store: MemoryStore, tenantId: string, leadId: string, quando: string, titulo: string, now: Date): AgendaItem {
  const lead = findLead(store, tenantId, leadId);
  const item: AgendaItem = {
    id: genId('ag'),
    tenantId,
    titulo: titulo || `Follow-up: ${lead.nome}`,
    quando,
    tipo: 'follow_up',
    relacionadoA: { tipo: 'lead', id: lead.id },
    concluido: false,
    criadoEm: now.toISOString(),
  };
  return store.addAgenda(item);
}

/** Marca um follow-up como concluído. */
export function concluirFollowUp(store: MemoryStore, tenantId: string, agendaId: string, now: Date): AgendaItem {
  const item = store.listAgenda(tenantId).find((a) => a.id === agendaId);
  if (!item) throw new Error(`Follow-up não encontrado: ${agendaId}`);
  item.concluido = true;
  item.titulo += ` (concluído em ${now.toISOString().slice(0, 10)})`;
  return item;
}

/**
 * Estima a capacidade mensal de entrega como proxy do faturamento médio mensal
 * observado (receitas ÷ nº de meses com receita). É ESTIMATIVA — o ideal é o dono
 * informar a capacidade real; por isso a marcamos como tal no painel.
 */
export function estimarCapacidadeMensal(store: MemoryStore, tenantId: string): number {
  const receitas = store.listTransactions(tenantId).filter((t) => t.kind === 'receita');
  if (!receitas.length) return 0;
  const meses = new Set(receitas.map((t) => t.data.slice(0, 7)));
  const total = receitas.reduce((s, t) => s + t.valor, 0);
  return Math.round((total / Math.max(1, meses.size)) * 100) / 100;
}

export interface PainelCRM {
  leadsAbertos: number;
  pipelineR$: number;
  followUpsPendentes: { id: string; titulo: string; quando: string }[];
  capacidade: CapacityAssessment;
  capacidadeBaseadaEm: 'estimativa_faturamento' | 'informada';
}

/** Visão consolidada do CRM para o dashboard. */
export function painelCRM(store: MemoryStore, tenantId: string, now: Date, capacidadeInformada?: number): PainelCRM {
  const tenant = store.getTenant(tenantId);
  if (!tenant) throw new Error(`Tenant inexistente: ${tenantId}`);
  requireFeature(tenant.plano, 'crm_agenda');

  const leads = store.listLeads(tenantId);
  const agenda = store.listAgenda(tenantId);
  const capacidade = capacidadeInformada ?? estimarCapacidadeMensal(store, tenantId);
  // toca computeKPIs só para validar isolamento/consistência do tenant nos dados usados
  void computeKPIs(store.listTransactions(tenantId), store.listReceivables(tenantId), store.listPayables(tenantId), now);

  return {
    leadsAbertos: openLeads(leads).length,
    pipelineR$: pipelineValue(leads),
    followUpsPendentes: pendingFollowUps(agenda).map((a) => ({ id: a.id, titulo: a.titulo, quando: a.quando })),
    capacidade: assessCapacity(leads, capacidade),
    capacidadeBaseadaEm: capacidadeInformada != null ? 'informada' : 'estimativa_faturamento',
  };
}
