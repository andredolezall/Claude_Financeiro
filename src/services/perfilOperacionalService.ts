/**
 * perfilOperacionalService.ts — O DG aprende a operação de cada cliente da conversa.
 *
 * O prazo de entrega (e capacidade/custo) é DINÂMICO por cliente: o DG calibra o
 * perfil operacional do tenant com o que o dono conta ("meu ciclo é 20 dias",
 * "entrego 7 mil por mês", "meu custo é 55%"). Isso torna a viabilização (cálculo de
 * prazo) fiel à operação individual — não um default global.
 */

import type { ExtractedEntry } from '../dg/extraction.js';
import type { PerfilOperacional } from '../core/types.js';
import { MemoryStore } from '../store/memoryStore.js';

const brl = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export interface InfoOperacionalAplicada {
  atualizou: string[];
}

/**
 * Aplica os fatos operacionais extraídos ao perfil do tenant (mutação no store) e
 * registra a proveniência. Retorna a lista do que foi aprendido (para o DG confirmar).
 */
export function aplicarInfoOperacional(
  store: MemoryStore,
  tenantId: string,
  entry: ExtractedEntry,
  now: Date,
): InfoOperacionalAplicada {
  const tenant = store.getTenant(tenantId);
  if (!tenant) throw new Error(`Tenant inexistente: ${tenantId}`);

  const atualizou: string[] = [];
  const novasNotas: PerfilOperacional['notas'] = [];
  const em = now.toISOString();

  if (entry.cicloEntregaDias != null && entry.cicloEntregaDias > 0) {
    tenant.cicloEntregaDias = entry.cicloEntregaDias;
    const fato = `ciclo de entrega ~${entry.cicloEntregaDias} dias`;
    atualizou.push(fato);
    novasNotas.push({ em, fato, origem: 'conversa' });
  }
  if (entry.capacidadeMensalR$ != null && entry.capacidadeMensalR$ > 0) {
    tenant.capacidadeMensalInformadaR$ = entry.capacidadeMensalR$;
    const fato = `capacidade ~${brl(entry.capacidadeMensalR$)}/mês`;
    atualizou.push(fato);
    novasNotas.push({ em, fato, origem: 'conversa' });
  }
  if (entry.custoVariavelPct != null && entry.custoVariavelPct > 0 && entry.custoVariavelPct <= 1) {
    tenant.custoVariavelPct = entry.custoVariavelPct;
    const fato = `custo variável ~${Math.round(entry.custoVariavelPct * 100)}% do faturamento`;
    atualizou.push(fato);
    novasNotas.push({ em, fato, origem: 'conversa' });
  }

  if (novasNotas.length) {
    const anterior = tenant.perfilOperacional?.notas ?? [];
    tenant.perfilOperacional = { atualizadoEm: em, notas: [...anterior, ...novasNotas] };
  }
  return { atualizou };
}
