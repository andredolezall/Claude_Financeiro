/**
 * consultant.ts — O DG como consultor (resposta de gestão com RAG + contexto + jornada).
 *
 * PROMPT MESTRE 5: o DG aconselha como consultor administrativo sênior. Aqui montamos
 * o system prompt (prompt.ts), recuperamos conhecimento (rag.ts), respeitamos o gating
 * por plano (entitlements) e chamamos o modelo capaz (MODELS.consultant).
 */

import { MODELS, type ClaudeClient, type ClaudeMessage } from './anthropic.js';
import { buildDgSystemPrompt, type DgContext } from './prompt.js';
import { KnowledgeBase } from './rag.js';
import { featureLevel } from '../core/entitlements.js';
import type { Tenant } from '../core/types.js';
import type { JourneyState } from '../core/journey.js';

export interface ConsultInput {
  tenant: Tenant;
  journey: JourneyState;
  question: string;
  history?: ClaudeMessage[];
  businessSnapshot?: string;
  anonymizedLearnings?: string[];
}

/**
 * Responde a uma pergunta de gestão. Respeita o gating do `dg_consultor`:
 *  - 'limited' (Starter): resposta curta de FAQ, com nudge de upgrade para análise profunda.
 *  - 'full'/'priority' (Pro/Enterprise): consultoria completa com RAG.
 */
export async function consult(
  claude: ClaudeClient,
  kb: KnowledgeBase,
  input: ConsultInput,
): Promise<{ answer: string; usedChunks: number; limited: boolean }> {
  const level = featureLevel(input.tenant.plano, 'dg_consultor');
  const limited = level === 'limited';

  const curated = kb.retrieve('kb_curado_dgr', {
    text: input.question,
    setor: input.tenant.setor,
    faixa: input.tenant.faixaFaturamento,
    topK: limited ? 2 : 5,
  });

  const ctx: DgContext = {
    tenant: input.tenant,
    journey: input.journey,
    curatedKnowledge: curated,
    anonymizedLearnings: input.tenant.consenteAprendizadoAgregado
      ? input.anonymizedLearnings
      : input.anonymizedLearnings, // leitura de padrões agregados é permitida a todos; só a CONTRIBUIÇÃO exige consentimento
    businessSnapshot: input.businessSnapshot,
  };

  let system = buildDgSystemPrompt(ctx);
  if (limited) {
    system +=
      '\n\n# MODO LIMITADO (plano Starter)\nResponda de forma objetiva e útil (FAQ), em até 4 linhas. ' +
      'Ao final, quando a pergunta pedir análise profunda do negócio, informe gentilmente que a ' +
      'consultoria completa do DG (diagnóstico personalizado e plano de ação) está nos planos Pro e Enterprise.';
  }

  const messages: ClaudeMessage[] = [
    ...(input.history ?? []),
    { role: 'user', content: input.question },
  ];

  const answer = await claude.complete({
    model: MODELS.consultant,
    system,
    temperature: 0.3,
    maxTokens: limited ? 400 : 1200,
    messages,
  });

  return { answer, usedChunks: curated.length, limited };
}
