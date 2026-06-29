/**
 * anonymization.ts — Retroalimentação entre empresas, com trava de privacidade.
 *
 * PROMPT MESTRE 5.4 + Regra Inviolável nº 7. Replica os parâmetros padrão da indústria
 * de IA (ver docs/pesquisa/04_governanca_dados_retroalimentacao.md):
 *   1. Não é aprendizado ao vivo — roda em job offline em lote (runLearningJob).
 *   2. Dado de cliente business é opt-in (consenteAprendizadoAgregado), não opt-out.
 *   3. De-identificação/remoção de PII antes da camada compartilhada (scrubPII).
 *   4. Só trafega agregado, com limiar mínimo N≥MIN_TENANTS para impedir reidentificação.
 *   5. Camada de "aprendizados" separada e curada (collection kb_aprendizado_anon).
 *   6. Retenção/deleção/reversibilidade (metadados do aprendizado).
 *
 * Vazar dado de um tenant para outro é falha grave — este módulo é a fronteira.
 */

import type { KnowledgeChunk } from '../dg/rag.js';
import type { RevenueTier } from '../core/types.js';

/** Limiar mínimo de empresas distintas para publicar um padrão (anti-reidentificação). */
export const MIN_TENANTS = Number(process.env.DGR_LEARNING_MIN_TENANTS ?? 5);

/** Sinal bruto observado num tenant (entrada do job; NUNCA sai daqui sem passar pelas travas). */
export interface TenantSignal {
  tenantId: string;
  setor: string;
  faixa: RevenueTier;
  /** Texto livre descrevendo a tática/medida e o resultado (pode conter PII — será limpo). */
  observacao: string;
  /** Converteu/funcionou? Usado para agregar só o que deu resultado (Regra nº 8). */
  funcionou: boolean;
  consentido: boolean; // espelha tenant.consenteAprendizadoAgregado
}

/**
 * Remove PII e identificadores antes de qualquer agregação:
 * nomes próprios óbvios, CNPJ/CPF, e-mails, telefones, valores absolutos em R$.
 * Conservador por design: na dúvida, mascara.
 */
export function scrubPII(text: string): string {
  return text
    // CNPJ / CPF
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '[CNPJ]')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[CPF]')
    // e-mail e telefone
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, '[EMAIL]')
    .replace(/\b(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}-?\d{4}\b/g, '[TELEFONE]')
    // valores absolutos em reais → faixa qualitativa (nunca o número exato)
    .replace(/R\$\s?\d[\d.,]*/g, '[VALOR]')
    // "da Maria", "do João" → contraparte genérica (heurística conservadora)
    .replace(/\b(d[aeo]s?)\s+[A-ZÀ-Ý][a-zà-ÿ]+/g, '$1 [CONTRAPARTE]')
    .trim();
}

/** Verifica se um texto ainda contém PII evidente (gate final antes de publicar). */
export function containsPII(text: string): boolean {
  return (
    /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/.test(text) ||
    /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/.test(text) ||
    /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/.test(text) ||
    /R\$\s?\d/.test(text)
  );
}

export interface AggregatedLearning {
  setor: string;
  faixa: RevenueTier;
  padrao: string;
  nTenants: number;
}

/**
 * Job offline em lote: pega sinais de vários tenants e produz aprendizados agregados.
 * Aplica TODAS as travas, em ordem:
 *  (a) descarta não-consentidos; (b) descarta o que não funcionou;
 *  (c) limpa PII; (d) agrupa por (setor, faixa, padrão normalizado);
 *  (e) só publica grupos com N≥MIN_TENANTS empresas DISTINTAS; (f) gate final anti-PII.
 */
export function runLearningJob(signals: TenantSignal[]): AggregatedLearning[] {
  const consented = signals.filter((s) => s.consentido && s.funcionou);

  // Agrupa por chave (setor|faixa|observação-limpa-normalizada).
  const groups = new Map<string, { setor: string; faixa: RevenueTier; padrao: string; tenants: Set<string> }>();
  for (const s of consented) {
    const cleaned = scrubPII(s.observacao);
    if (containsPII(cleaned)) continue; // não atravessa a fronteira
    const norm = cleaned.toLowerCase().replace(/\s+/g, ' ').trim();
    const key = `${s.setor}|${s.faixa}|${norm}`;
    const g = groups.get(key) ?? { setor: s.setor, faixa: s.faixa, padrao: cleaned, tenants: new Set<string>() };
    g.tenants.add(s.tenantId);
    groups.set(key, g);
  }

  return [...groups.values()]
    .filter((g) => g.tenants.size >= MIN_TENANTS)
    .map((g) => ({ setor: g.setor, faixa: g.faixa, padrao: g.padrao, nTenants: g.tenants.size }));
}

/** Converte aprendizados agregados em chunks da coleção interna (separada da curada). */
export function learningsToChunks(learnings: AggregatedLearning[]): KnowledgeChunk[] {
  return learnings.map((l, i) => ({
    id: `learn_${l.setor}_${l.faixa}_${i}`,
    collection: 'kb_aprendizado_anon' as const,
    text: l.padrao,
    metadata: {
      fonte: `aprendizado_agregado (N=${l.nTenants} empresas)`,
      setor: l.setor,
      faixa: l.faixa,
      evidencia: 'comprovado' as const,
    },
  }));
}
