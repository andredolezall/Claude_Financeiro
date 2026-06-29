/**
 * prompt.ts — Montagem do system prompt do DG.
 *
 * Combina, em ordem: (1) a Constituição da DGR; (2) a persona versionada
 * (prompts/dg_consultor.md); (3) o contexto do tenant; (4) o estado da jornada;
 * (5) trechos da base de conhecimento (RAG) e aprendizados anonimizados.
 *
 * Nada de persona "solta no código" (PROMPT MESTRE 5.2): o comportamento mora no
 * arquivo .md versionado; aqui apenas montamos.
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { constitutionAsPromptBlock } from '../core/dgr_constitution.js';
import { journeySummary, type JourneyState } from '../core/journey.js';
import type { Tenant } from '../core/types.js';
import type { RetrievedChunk } from './rag.js';

/**
 * Localiza prompts/dg_consultor.md subindo a partir deste módulo. Funciona tanto
 * rodando do código-fonte quanto do build em dist/ (a profundidade muda). Pode ser
 * sobrescrito por DGR_PROMPTS_DIR.
 */
function resolvePersonaPath(): string {
  if (process.env.DGR_PROMPTS_DIR) {
    return join(process.env.DGR_PROMPTS_DIR, 'dg_consultor.md');
  }
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    const candidate = join(dir, 'prompts', 'dg_consultor.md');
    if (existsSync(candidate)) return candidate;
    dir = dirname(dir);
  }
  throw new Error('prompts/dg_consultor.md não encontrado — defina DGR_PROMPTS_DIR.');
}

let personaCache: string | null = null;

/** Carrega a persona do arquivo versionado (com cache em memória). */
export function loadPersona(): string {
  if (personaCache === null) {
    const raw = readFileSync(resolvePersonaPath(), 'utf-8');
    // Remove o front-matter YAML (metadados) — fica só o corpo do prompt.
    personaCache = raw.replace(/^---[\s\S]*?---\n/, '').trim();
  }
  return personaCache;
}

export interface DgContext {
  tenant: Tenant;
  journey: JourneyState;
  /** Trechos recuperados da base curada (citáveis). */
  curatedKnowledge?: RetrievedChunk[];
  /** Padrões anonimizados/agregados entre tenants (nunca dado bruto). */
  anonymizedLearnings?: string[];
  /** Snapshot do contexto operacional do negócio (KPIs, recebíveis em aberto, etc.). */
  businessSnapshot?: string;
}

function tenantBlock(t: Tenant): string {
  return [
    `# CONTEXTO DESTA EMPRESA (tenant — use para personalizar)`,
    `- Nome: ${t.nome}`,
    `- Setor: ${t.setor}`,
    `- Faixa de porte: ${t.faixaFaturamento} (calibre o discurso por esta faixa)`,
    `- Plano contratado: ${t.plano}`,
  ].join('\n');
}

function knowledgeBlock(chunks: RetrievedChunk[]): string {
  if (!chunks.length) return '';
  const items = chunks
    .map(
      (c, i) =>
        `[${i + 1}] (${c.metadata.fonte}; faixa: ${c.metadata.faixa ?? 'geral'}) ${c.text}`,
    )
    .join('\n');
  return [
    `# BASE DE CONHECIMENTO CURADA (cite a fonte ao usar — Regra nº 1)`,
    items,
    `> Se nenhum trecho cobrir o caso, diga que não tem evidência suficiente e sugira validar.`,
  ].join('\n');
}

function learningsBlock(learnings: string[]): string {
  if (!learnings.length) return '';
  return [
    `# APRENDIZADOS ANONIMIZADOS (padrões agregados — NUNCA dado de outro cliente)`,
    ...learnings.map((l) => `- ${l}`),
  ].join('\n');
}

/** Monta o system prompt completo do DG para uma interação. */
export function buildDgSystemPrompt(ctx: DgContext): string {
  const parts = [
    constitutionAsPromptBlock(),
    '',
    loadPersona(),
    '',
    tenantBlock(ctx.tenant),
    ctx.businessSnapshot ? `\n# SITUAÇÃO OPERACIONAL ATUAL\n${ctx.businessSnapshot}` : '',
    '',
    `# JORNADA DO CLIENTE (Do Diagnóstico ao Lucro)`,
    journeySummary(ctx.journey),
    ctx.curatedKnowledge?.length ? '\n' + knowledgeBlock(ctx.curatedKnowledge) : '',
    ctx.anonymizedLearnings?.length ? '\n' + learningsBlock(ctx.anonymizedLearnings) : '',
  ];
  return parts.filter(Boolean).join('\n');
}
