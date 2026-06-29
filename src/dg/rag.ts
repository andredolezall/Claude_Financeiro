/**
 * rag.ts — Recuperação da base de conhecimento do DG.
 *
 * PROMPT MESTRE 3.3 / 5.1 / 5.4: o DG é alimentado por DUAS coleções SEPARADAS:
 *   - `kb_curado_dgr`        → conhecimento curado pela DGR (citável na resposta).
 *   - `kb_aprendizado_anon`  → aprendizados anonimizados/agregados entre tenants
 *                              (interno; nunca expõe dado bruto de cliente — Regra nº 7).
 *
 * Esta é a implementação de referência do MVP: um recuperador léxico (keyword/score)
 * em memória, com a MESMA interface que um índice vetorial teria. Em produção, troca-se
 * o backend por embeddings + base vetorial (pgvector/Qdrant) sem mudar os chamadores.
 */

import type { RevenueTier } from '../core/types.js';

export type Collection = 'kb_curado_dgr' | 'kb_aprendizado_anon';

export interface KnowledgeChunk {
  id: string;
  collection: Collection;
  text: string;
  metadata: {
    fonte: string; // origem citável (ex.: "SEBRAE 2024") ou "aprendizado_agregado"
    setor?: string;
    faixa?: RevenueTier | 'geral';
    /** 'comprovado' | 'hipotese' — Regra nº 1: o DG sinaliza hipótese não comprovada. */
    evidencia: 'comprovado' | 'hipotese';
  };
}

export interface RetrievedChunk extends KnowledgeChunk {
  score: number;
}

export interface RetrieveQuery {
  text: string;
  setor?: string;
  faixa?: RevenueTier;
  topK?: number;
}

const STOPWORDS = new Set([
  'a','o','e','de','do','da','que','para','com','em','um','uma','os','as','no','na','por','meu','minha','como','se','tem','é','ao','dos','das',
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

/**
 * Índice em memória. Mantém as coleções separadas fisicamente — a fronteira entre
 * `kb_curado_dgr` e `kb_aprendizado_anon` é a mesma fronteira de privacidade da Regra nº 7.
 */
export class KnowledgeBase {
  private chunks: KnowledgeChunk[] = [];

  add(chunk: KnowledgeChunk): void {
    this.chunks.push(chunk);
  }

  addMany(chunks: KnowledgeChunk[]): void {
    chunks.forEach((c) => this.add(c));
  }

  size(collection?: Collection): number {
    return collection ? this.chunks.filter((c) => c.collection === collection).length : this.chunks.length;
  }

  /** Recupera os topK trechos de UMA coleção, com filtro por setor/faixa e score léxico. */
  retrieve(collection: Collection, q: RetrieveQuery): RetrievedChunk[] {
    const qTokens = new Set(tokenize(q.text));
    const topK = q.topK ?? 4;
    return this.chunks
      .filter((c) => c.collection === collection)
      .map((c): RetrievedChunk => {
        const cTokens = tokenize(c.text);
        let overlap = 0;
        for (const t of cTokens) if (qTokens.has(t)) overlap++;
        let score = overlap;
        // Boost por aderência de metadados (setor/faixa) — recuperação híbrida.
        if (q.setor && c.metadata.setor && c.metadata.setor === q.setor) score += 2;
        if (q.faixa && c.metadata.faixa && c.metadata.faixa === q.faixa) score += 1;
        return { ...c, score };
      })
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}
