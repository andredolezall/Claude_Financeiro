/**
 * memoryStore.ts — Armazenamento multi-tenant em memória (referência do MVP).
 *
 * Isolamento por tenant é requisito de LGPD (Regra nº 4/nº 7): TODA leitura/escrita
 * exige tenantId e nunca retorna dado de outro tenant. Em produção, troca-se por
 * Postgres com Row-Level Security mantendo esta interface.
 */

import type {
  AgendaItem, Lead, Payable, Receivable, Tenant, Transaction, User,
} from '../core/types.js';
import { createJourney, type JourneyState } from '../core/journey.js';
import type { TenantSignal } from '../learning/anonymization.js';

let seq = 0;
export function genId(prefix: string): string {
  seq += 1;
  return `${prefix}_${seq.toString(36)}`;
}

export class MemoryStore {
  private tenants = new Map<string, Tenant>();
  private users = new Map<string, User>();
  private txns = new Map<string, Transaction[]>();
  private receivables = new Map<string, Receivable[]>();
  private payables = new Map<string, Payable[]>();
  private agenda = new Map<string, AgendaItem[]>();
  private leads = new Map<string, Lead[]>();
  private journeys = new Map<string, JourneyState>();
  /** Sinais brutos de decisão por tenant — só a versão agregada/anonimizada sai daqui. */
  private signals = new Map<string, TenantSignal[]>();

  // --- tenants ---
  createTenant(t: Tenant): Tenant {
    this.tenants.set(t.id, t);
    this.journeys.set(t.id, createJourney(t.id, t.criadoEm));
    for (const m of [this.txns, this.receivables, this.payables, this.agenda, this.leads]) {
      if (!m.has(t.id)) m.set(t.id, []);
    }
    if (!this.signals.has(t.id)) this.signals.set(t.id, []);
    return t;
  }
  getTenant(id: string): Tenant | undefined {
    return this.tenants.get(id);
  }
  listTenants(): Tenant[] {
    return [...this.tenants.values()];
  }
  /** Garante que o tenant existe — falha cedo evita vazamento por id inválido. */
  private assertTenant(tenantId: string): void {
    if (!this.tenants.has(tenantId)) throw new Error(`Tenant inexistente: ${tenantId}`);
  }

  // --- users ---
  addUser(u: User): User {
    this.assertTenant(u.tenantId);
    this.users.set(u.id, u);
    return u;
  }
  findUserByWhatsapp(whatsapp: string): User | undefined {
    return [...this.users.values()].find((u) => u.whatsapp === whatsapp);
  }

  // --- journey ---
  getJourney(tenantId: string): JourneyState {
    this.assertTenant(tenantId);
    return this.journeys.get(tenantId)!;
  }
  setJourney(state: JourneyState): void {
    this.assertTenant(state.tenantId);
    this.journeys.set(state.tenantId, state);
  }

  // --- transactions ---
  addTransaction(tx: Transaction): Transaction {
    this.assertTenant(tx.tenantId);
    this.txns.get(tx.tenantId)!.push(tx);
    return tx;
  }
  listTransactions(tenantId: string): Transaction[] {
    this.assertTenant(tenantId);
    return [...this.txns.get(tenantId)!];
  }

  // --- receivables / payables ---
  addReceivable(r: Receivable): Receivable {
    this.assertTenant(r.tenantId);
    this.receivables.get(r.tenantId)!.push(r);
    return r;
  }
  listReceivables(tenantId: string): Receivable[] {
    this.assertTenant(tenantId);
    return [...this.receivables.get(tenantId)!];
  }
  addPayable(p: Payable): Payable {
    this.assertTenant(p.tenantId);
    this.payables.get(p.tenantId)!.push(p);
    return p;
  }
  listPayables(tenantId: string): Payable[] {
    this.assertTenant(tenantId);
    return [...this.payables.get(tenantId)!];
  }

  // --- agenda ---
  addAgenda(a: AgendaItem): AgendaItem {
    this.assertTenant(a.tenantId);
    this.agenda.get(a.tenantId)!.push(a);
    return a;
  }
  listAgenda(tenantId: string): AgendaItem[] {
    this.assertTenant(tenantId);
    return [...this.agenda.get(tenantId)!];
  }

  // --- leads ---
  addLead(l: Lead): Lead {
    this.assertTenant(l.tenantId);
    this.leads.get(l.tenantId)!.push(l);
    return l;
  }
  listLeads(tenantId: string): Lead[] {
    this.assertTenant(tenantId);
    return [...this.leads.get(tenantId)!];
  }

  // --- learning signals (dado bruto do tenant; agregação/anonimização à parte) ---
  addSignal(s: TenantSignal): TenantSignal {
    this.assertTenant(s.tenantId);
    this.signals.get(s.tenantId)!.push(s);
    return s;
  }
  listSignals(tenantId: string): TenantSignal[] {
    this.assertTenant(tenantId);
    return [...this.signals.get(tenantId)!];
  }
  /** Todos os sinais de todos os tenants — usado SÓ pelo job offline de aprendizado. */
  listAllSignals(): TenantSignal[] {
    return [...this.signals.values()].flat();
  }
}
