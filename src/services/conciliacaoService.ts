/**
 * conciliacaoService.ts — Aplica a conciliação de recebíveis no store, com gating.
 *
 * Camada de serviço (faz I/O sobre o store). A lógica de casamento é pura
 * (core/conciliacao.ts); aqui decidimos, por plano, se a baixa é AUTOMÁTICA ou
 * apenas SUGERIDA, conforme a matriz §7.1:
 *   - Starter (limited): manual-assistida → só sugere, não baixa.
 *   - Pro (full): automática → baixa matches de ALTA confiança.
 *   - Enterprise (priority): automática + régua → baixa alta confiança (régua à parte).
 */

import { conciliarRecebiveis, type ConciliationMatch, type ConciliationResult } from '../core/conciliacao.js';
import { meetsLevel } from '../core/entitlements.js';
import type { MemoryStore } from '../store/memoryStore.js';

export interface ConciliacaoOutcome {
  result: ConciliationResult;
  /** Baixas efetivamente aplicadas (recebível marcado como recebido). */
  baixados: ConciliationMatch[];
  /** Matches que precisam de confirmação humana (média confiança ou plano manual). */
  aRevisar: ConciliationMatch[];
  modo: 'automatica' | 'manual_assistida';
}

/**
 * Concilia o tenant e aplica baixas conforme o plano. Marca o recebível como
 * 'recebido' e a transação como conciliada quando a baixa é aplicada.
 */
export function conciliarTenant(store: MemoryStore, tenantId: string, now: Date): ConciliacaoOutcome {
  const tenant = store.getTenant(tenantId);
  if (!tenant) throw new Error(`Tenant inexistente: ${tenantId}`);

  const receitas = store.listTransactions(tenantId);
  const receivables = store.listReceivables(tenantId);
  const result = conciliarRecebiveis(receitas, receivables);

  const automatica = meetsLevel(tenant.plano, 'conciliacao_recebiveis', 'full');
  const baixados: ConciliationMatch[] = [];
  const aRevisar: ConciliationMatch[] = [];

  for (const m of result.matches) {
    const podeBaixarAuto = automatica && m.confidence === 'alta';
    if (podeBaixarAuto) {
      // Mutação idempotente: só baixa o que ainda está em aberto.
      if (m.receivable.status === 'aberto' || m.receivable.status === 'atrasado') {
        m.receivable.status = 'recebido';
        m.receivable.recebidoEm = now.toISOString();
        m.transaction.conciliado = true;
        baixados.push(m);
      }
    } else {
      aRevisar.push(m);
    }
  }

  return {
    result,
    baixados,
    aRevisar,
    modo: automatica ? 'automatica' : 'manual_assistida',
  };
}
