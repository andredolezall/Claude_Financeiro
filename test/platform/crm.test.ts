/**
 * crm.test.ts — Testes do CRM com agenda inteligente.
 *
 * Cobre: gating por plano, ciclo do lead, follow-up na agenda, e o diferencial
 * oportunidade × capacidade de entrega.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  criarLead, registrarInteracao, avancarEstagio, agendarFollowUp, concluirFollowUp,
  estimarCapacidadeMensal, painelCRM,
} from '../../src/services/crmService.js';
import { assessCapacity, pipelineValue, openLeads } from '../../src/crm/crm.js';
import { FeatureLockedError } from '../../src/core/entitlements.js';
import { MemoryStore } from '../../src/store/memoryStore.js';
import type { Lead, PlanKey, Tenant } from '../../src/core/types.js';

const now = new Date('2026-06-30T12:00:00Z');

function makeStore(plano: PlanKey): MemoryStore {
  const store = new MemoryStore();
  const tenant: Tenant = {
    id: 't', nome: 'T', setor: 'servicos', faixaFaturamento: 'pequena', plano,
    consenteAprendizadoAgregado: false, whatsappOptIn: true, criadoEm: '2026-06-01',
  };
  store.createTenant(tenant);
  return store;
}

test('gating: Starter não tem CRM (FeatureLockedError com upsell para pro)', () => {
  const store = makeStore('starter');
  assert.throws(
    () => criarLead(store, 't', { nome: 'Lead A', valorPotencial: 1000 }, now),
    (e: unknown) => e instanceof FeatureLockedError && e.upgradeTo === 'pro',
  );
});

test('lead: cria, registra interação e avança estágio com histórico', () => {
  const store = makeStore('pro');
  const lead = criarLead(store, 't', { nome: 'Escola Crescer', valorPotencial: 6000, ticketMedio: 1500 }, now);
  assert.equal(lead.estagio, 'novo');
  registrarInteracao(store, 't', lead.id, 'Pediu orçamento', now);
  avancarEstagio(store, 't', lead.id, 'proposta', now);
  const atualizado = store.listLeads('t')[0];
  assert.equal(atualizado.estagio, 'proposta');
  assert.ok(atualizado.historico.length >= 3); // criado + interação + mudança de estágio
});

test('follow-up: agenda cria item e concluir marca como feito', () => {
  const store = makeStore('pro');
  const lead = criarLead(store, 't', { nome: 'Condomínio', valorPotencial: 3200 }, now);
  const ag = agendarFollowUp(store, 't', lead.id, '2026-07-02T14:00:00Z', 'Ligar para o síndico', now);
  assert.equal(ag.tipo, 'follow_up');
  assert.equal(ag.relacionadoA?.id, lead.id);
  concluirFollowUp(store, 't', ag.id, now);
  assert.equal(store.listAgenda('t')[0].concluido, true);
});

test('capacidade: sinaliza quando a oportunidade na mesa excede a entrega', () => {
  const leads: Lead[] = [
    { id: 'l1', tenantId: 't', nome: 'A', estagio: 'qualificado', valorPotencial: 8000, historico: [], criadoEm: '' },
    { id: 'l2', tenantId: 't', nome: 'B', estagio: 'ganho', valorPotencial: 5000, historico: [], criadoEm: '' },
  ];
  assert.equal(openLeads(leads).length, 1); // 'ganho' não conta como aberto
  assert.equal(pipelineValue(leads), 8000);
  const acima = assessCapacity(leads, 3000);
  assert.equal(acima.oportunidadeAcimaDaCapacidade, true);
  const dentro = assessCapacity(leads, 20000);
  assert.equal(dentro.oportunidadeAcimaDaCapacidade, false);
});

test('capacidade estimada: média mensal de receita (proxy)', () => {
  const store = makeStore('pro');
  store.addTransaction({ id: 'a', tenantId: 't', kind: 'receita', valor: 3000, data: '2026-05-10', origem: 'whatsapp', conciliado: true, criadoEm: '' });
  store.addTransaction({ id: 'b', tenantId: 't', kind: 'receita', valor: 5000, data: '2026-06-10', origem: 'whatsapp', conciliado: true, criadoEm: '' });
  store.addTransaction({ id: 'c', tenantId: 't', kind: 'despesa', valor: 999, data: '2026-06-10', origem: 'portal', conciliado: true, criadoEm: '' });
  assert.equal(estimarCapacidadeMensal(store, 't'), 4000); // (3000+5000)/2 meses
});

test('painel: consolida leads, pipeline, follow-ups e capacidade', () => {
  const store = makeStore('pro');
  const lead = criarLead(store, 't', { nome: 'X', valorPotencial: 10000 }, now);
  agendarFollowUp(store, 't', lead.id, '2026-07-02T14:00:00Z', 'follow', now);
  const painel = painelCRM(store, 't', now, 4000);
  assert.equal(painel.leadsAbertos, 1);
  assert.equal(painel.pipelineR$, 10000);
  assert.equal(painel.followUpsPendentes.length, 1);
  assert.equal(painel.capacidade.oportunidadeAcimaDaCapacidade, true);
  assert.equal(painel.capacidadeBaseadaEm, 'informada');
});
