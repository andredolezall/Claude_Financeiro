/**
 * diagnosticoService.ts — Orquestra o diagnóstico do DG sobre o dado do tenant.
 *
 * Roda os detectores (dg/diagnostico.ts), grava os achados quantificados na jornada,
 * propõe um plano de ação priorizado por impacto (Regra nº 8) e avança a jornada de
 * 'diagnostico' para 'orientacao'. A narração didática pelo DG é opcional (narrar...).
 */

import { diagnosticar, impactoTotal, type Finding } from '../dg/diagnostico.js';
import { advance, type JourneyStage, type PlanoAcaoItem } from '../core/journey.js';
import { buildDgSystemPrompt } from '../dg/prompt.js';
import { MODELS, type ClaudeClient } from '../dg/anthropic.js';
import { KnowledgeBase } from '../dg/rag.js';
import { MemoryStore, genId } from '../store/memoryStore.js';

const brl = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export interface DiagnosticoOutcome {
  findings: Finding[];
  impactoTotalR$: number;
  planoProposto: PlanoAcaoItem[];
  journeyStage: JourneyStage;
  resumo: string;
}

/** Transforma cada achado em um passo de plano priorizado pelo impacto no resultado. */
function planoFromFindings(findings: Finding[], now: Date): PlanoAcaoItem[] {
  const prazo = new Date(now.getTime() + 7 * 86_400_000).toISOString().slice(0, 10);
  return findings.map((f) => ({
    id: genId('plan'),
    acao: f.recomendacao,
    responsavel: 'dono',
    prazo,
    metricaSucesso: `Reduzir o impacto de "${f.chave}" (hoje ~${brl(f.impactoMensalR$)}/mês)`,
    impactoEstimadoR$: f.impactoMensalR$,
    status: 'pendente' as const,
  }));
}

function resumoDeterministico(findings: Finding[]): string {
  if (!findings.length) return 'Não encontrei problemas que estejam drenando seu resultado agora. Vamos manter o monitoramento.';
  const total = impactoTotal(findings);
  const linhas = findings.map((f, i) => `${i + 1}. ${f.problema} (impacto ~${brl(f.impactoMensalR$)}/mês, base: ${f.base}). O que fazer: ${f.recomendacao}`);
  return [
    `Diagnóstico: encontrei ${findings.length} ponto(s) drenando seu resultado, somando ~${brl(total)}/mês.`,
    ...linhas,
  ].join('\n');
}

/**
 * Gera o diagnóstico, persiste na jornada e propõe o plano. Idempotente em relação
 * à etapa: só avança 'diagnostico' → 'orientacao' quando há achados.
 */
export function gerarDiagnostico(
  store: MemoryStore,
  tenantId: string,
  now: Date,
  opts?: { margemPerdidaPorFaltaConciliacao?: number; saldoInicial?: number },
): DiagnosticoOutcome {
  const tenant = store.getTenant(tenantId);
  if (!tenant) throw new Error(`Tenant inexistente: ${tenantId}`);

  const findings = diagnosticar({
    txns: store.listTransactions(tenantId),
    receivables: store.listReceivables(tenantId),
    payables: store.listPayables(tenantId),
    now,
    saldoInicial: opts?.saldoInicial,
    margemPerdidaPorFaltaConciliacao: opts?.margemPerdidaPorFaltaConciliacao,
  });

  const planoProposto = planoFromFindings(findings, now);
  let journey = store.getJourney(tenantId);

  // Persiste achados e plano proposto na jornada.
  journey = {
    ...journey,
    diagnosticos: findings.map((f) => ({ problema: f.problema, impactoMensalR$: f.impactoMensalR$, fonte: f.fonte })),
    plano: planoProposto,
    atualizadoEm: now.toISOString(),
  };
  // Avança a jornada só quando há diagnóstico quantificado (critério da etapa 1).
  if (findings.length && journey.stage === 'diagnostico') {
    journey = advance(journey, `Diagnóstico gerado: ${findings.length} achado(s)`, now.toISOString());
  }
  store.setJourney(journey);

  return {
    findings,
    impactoTotalR$: impactoTotal(findings),
    planoProposto,
    journeyStage: journey.stage,
    resumo: resumoDeterministico(findings),
  };
}

/**
 * Narração didática do diagnóstico pelo DG (persona + Constituição + contexto).
 * Os NÚMEROS vêm dos achados determinísticos; o DG só explica e justifica (Regra nº 1).
 */
export async function narrarDiagnostico(
  claude: ClaudeClient,
  kb: KnowledgeBase,
  store: MemoryStore,
  tenantId: string,
  findings: Finding[],
): Promise<string> {
  const tenant = store.getTenant(tenantId);
  if (!tenant) throw new Error(`Tenant inexistente: ${tenantId}`);
  const journey = store.getJourney(tenantId);
  const curated = kb.retrieve('kb_curado_dgr', { text: findings.map((f) => f.chave).join(' '), setor: tenant.setor, faixa: tenant.faixaFaturamento, topK: 3 });
  const system = buildDgSystemPrompt({ tenant, journey, curatedKnowledge: curated });
  const achados = findings.map((f) => `- ${f.problema} | impacto ~${brl(f.impactoMensalR$)}/mês (${f.base}) | ação: ${f.recomendacao}`).join('\n');
  return claude.complete({
    model: MODELS.consultant,
    system,
    temperature: 0.3,
    maxTokens: 900,
    messages: [
      {
        role: 'user',
        content:
          'Apresente este diagnóstico ao dono de forma didática e respeitosa, explicando o PORQUÊ de cada ponto e ' +
          'priorizando o que mais aproxima do lucro. NÃO altere os números abaixo (eles são medidos do dado real):\n\n' +
          achados,
      },
    ],
  });
}
