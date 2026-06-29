/**
 * crm.ts — CRM com agenda inteligente por tenant.
 *
 * PROMPT MESTRE 7.2: registra leads/oportunidades, mostra follow-ups pendentes,
 * estima a capacidade operacional de atender vs. oportunidade na mesa, e o DG
 * sugere a abordagem de follow-up (com justificativa — espírito didático 5.2).
 */

import { meetsLevel } from '../core/entitlements.js';
import { MODELS, type ClaudeClient } from '../dg/anthropic.js';
import { buildDgSystemPrompt } from '../dg/prompt.js';
import { KnowledgeBase } from '../dg/rag.js';
import type { AgendaItem, Lead, Tenant } from '../core/types.js';
import type { JourneyState } from '../core/journey.js';

const brl = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

/** Oportunidades em aberto (não ganhas nem perdidas). */
export function openLeads(leads: Lead[]): Lead[] {
  return leads.filter((l) => l.estagio !== 'ganho' && l.estagio !== 'perdido');
}

/** Soma do valor potencial "na mesa" (oportunidade de faturamento disponível). */
export function pipelineValue(leads: Lead[]): number {
  return openLeads(leads).reduce((s, l) => s + l.valorPotencial, 0);
}

/** Follow-ups pendentes (agenda) ordenados por data. */
export function pendingFollowUps(agenda: AgendaItem[]): AgendaItem[] {
  return agenda
    .filter((a) => a.tipo === 'follow_up' && !a.concluido)
    .sort((a, b) => new Date(a.quando).getTime() - new Date(b.quando).getTime());
}

export interface CapacityAssessment {
  oportunidadeNaMesa: number;
  leadsEmAberto: number;
  capacidadeMensalEstimada: number;
  /** Há receita "na mesa" que a empresa talvez não consiga entregar? */
  oportunidadeAcimaDaCapacidade: boolean;
  mensagem: string;
}

/**
 * Cruza oportunidade de faturamento disponível com a capacidade operacional estimada.
 * Não adianta gerar demanda que o cliente não consegue entregar (7.2).
 * `capacidadeMensalEstimada` vem do contexto do negócio (faturamento/operação).
 */
export function assessCapacity(leads: Lead[], capacidadeMensalEstimada: number): CapacityAssessment {
  const oportunidade = pipelineValue(leads);
  const acima = oportunidade > capacidadeMensalEstimada;
  return {
    oportunidadeNaMesa: oportunidade,
    leadsEmAberto: openLeads(leads).length,
    capacidadeMensalEstimada,
    oportunidadeAcimaDaCapacidade: acima,
    mensagem: acima
      ? `Você tem ${brl(oportunidade)} em oportunidades abertas, acima da sua capacidade estimada de entrega (${brl(capacidadeMensalEstimada)}/mês). Priorize os leads de maior ticket/conversão para não deixar receita esfriar nem prometer o que não entrega.`
      : `Há ${brl(oportunidade)} em oportunidades abertas dentro da sua capacidade de entrega (${brl(capacidadeMensalEstimada)}/mês). Foco em converter o que está na mesa.`,
  };
}

/**
 * O DG sugere a abordagem correta para converter um follow-up, usando o contexto
 * da empresa e o repertório de táticas validadas. A sugestão vem com o porquê.
 * Disponível no nível priority (Enterprise: "completo + sugestão de abordagem").
 */
export async function suggestApproach(
  claude: ClaudeClient,
  kb: KnowledgeBase,
  tenant: Tenant,
  journey: JourneyState,
  lead: Lead,
): Promise<{ sugestao: string; disponivel: boolean }> {
  if (!meetsLevel(tenant.plano, 'crm_agenda', 'priority')) {
    return {
      disponivel: false,
      sugestao:
        'A sugestão de abordagem do DG para follow-ups está no plano Enterprise. No seu plano, você vê os follow-ups pendentes e o valor na mesa.',
    };
  }
  const curated = kb.retrieve('kb_curado_dgr', {
    text: `abordagem de follow-up para converter venda ${tenant.setor}`,
    setor: tenant.setor,
    faixa: tenant.faixaFaturamento,
    topK: 3,
  });
  const system = buildDgSystemPrompt({ tenant, journey, curatedKnowledge: curated });
  const histico = lead.historico.map((h) => `- ${h.data}: ${h.nota}`).join('\n') || '- (sem histórico)';
  const sugestao = await claude.complete({
    model: MODELS.consultant,
    system,
    temperature: 0.4,
    maxTokens: 600,
    messages: [
      {
        role: 'user',
        content:
          `Sugira a melhor abordagem para converter este follow-up, com o PORQUÊ (justificativa) e ` +
          `ancorado em tática validada para negócios como o meu.\n\n` +
          `Lead: ${lead.nome}\nEstágio: ${lead.estagio}\nValor potencial: ${brl(lead.valorPotencial)}\n` +
          `Ticket médio: ${lead.ticketMedio ? brl(lead.ticketMedio) : 'n/d'}\nHistórico:\n${histico}`,
      },
    ],
  });
  return { sugestao, disponivel: true };
}
