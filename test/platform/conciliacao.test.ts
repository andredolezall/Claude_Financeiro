/**
 * conciliacao.test.ts — Testes do slice de recebíveis: conciliação + régua de cobrança.
 *
 * Cobre o que decide resultado/risco: casamento correto, gating de baixa por plano,
 * e disparo da régua na data certa por plano. Rode: npm test.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { conciliarRecebiveis, normalizeName } from '../../src/core/conciliacao.js';
import { conciliarTenant } from '../../src/services/conciliacaoService.js';
import { cobrancasDoDia, dunningParaRecebivel, reguaDoPlano, REGUA_PADRAO } from '../../src/notifications/regua.js';
import { MemoryStore } from '../../src/store/memoryStore.js';
import type { PlanKey, Receivable, Tenant, Transaction } from '../../src/core/types.js';

const receita = (id: string, valor: number, contraparte: string, data: string): Transaction => ({
  id, tenantId: 't', kind: 'receita', valor, contraparte, data, origem: 'whatsapp', conciliado: false, criadoEm: data,
});
const recebivel = (id: string, valor: number, contraparte: string, vencimento: string, status: Receivable['status'] = 'aberto'): Receivable => ({
  id, tenantId: 't', contraparte, valor, vencimento, status, criadoEm: vencimento,
});

test('conciliação: casa por contraparte + valor com alta confiança', () => {
  const r = conciliarRecebiveis(
    [receita('x1', 350, 'Maria Silva', '2026-06-30')],
    [recebivel('r1', 350, 'Maria', '2026-06-29')],
  );
  assert.equal(r.matches.length, 1);
  assert.equal(r.matches[0].confidence, 'alta');
  assert.equal(r.recebiveisEmAberto.length, 0);
  assert.equal(r.receitasSemRecebivel.length, 0);
});

test('conciliação: valor igual mas nome diferente → média confiança', () => {
  const r = conciliarRecebiveis(
    [receita('x1', 500, 'Joao', '2026-06-30')],
    [recebivel('r1', 500, 'Pedro', '2026-06-29')],
  );
  assert.equal(r.matches.length, 1);
  assert.equal(r.matches[0].confidence, 'media');
});

test('conciliação: sem correspondência separa aberto e receita avulsa', () => {
  const r = conciliarRecebiveis(
    [receita('x1', 999, 'Avulso', '2026-06-30')],
    [recebivel('r1', 350, 'Maria', '2026-06-29')],
  );
  assert.equal(r.matches.length, 0);
  assert.equal(r.recebiveisEmAberto.length, 1);
  assert.equal(r.receitasSemRecebivel.length, 1);
});

test('conciliação: cada receita é usada no máximo uma vez', () => {
  const r = conciliarRecebiveis(
    [receita('x1', 100, 'Ana', '2026-06-30')],
    [recebivel('r1', 100, 'Ana', '2026-06-29'), recebivel('r2', 100, 'Ana', '2026-06-29')],
  );
  assert.equal(r.matches.length, 1);
  assert.equal(r.recebiveisEmAberto.length, 1);
});

function makeStore(plano: PlanKey): { store: MemoryStore; tenant: Tenant } {
  const store = new MemoryStore();
  const tenant: Tenant = {
    id: 't', nome: 'T', setor: 's', faixaFaturamento: 'pequena', plano,
    consenteAprendizadoAgregado: false, whatsappOptIn: true, criadoEm: '2026-06-01',
  };
  store.createTenant(tenant);
  store.addTransaction({ ...receita('x1', 350, 'Maria', '2026-06-30'), tenantId: 't' });
  store.addReceivable({ ...recebivel('r1', 350, 'Maria', '2026-06-29'), tenantId: 't' });
  return { store, tenant };
}

test('gating: Pro concilia automaticamente (baixa de alta confiança)', () => {
  const { store } = makeStore('pro');
  const out = conciliarTenant(store, 't', new Date('2026-06-30T12:00:00Z'));
  assert.equal(out.modo, 'automatica');
  assert.equal(out.baixados.length, 1);
  assert.equal(store.listReceivables('t')[0].status, 'recebido');
});

test('gating: Starter é manual-assistida (sugere, não baixa)', () => {
  const { store } = makeStore('starter');
  const out = conciliarTenant(store, 't', new Date('2026-06-30T12:00:00Z'));
  assert.equal(out.modo, 'manual_assistida');
  assert.equal(out.baixados.length, 0);
  assert.equal(out.aRevisar.length, 1);
  assert.equal(store.listReceivables('t')[0].status, 'aberto');
});

test('régua: gating por plano (Starter sem régua, Pro básica, Enterprise completa)', () => {
  assert.equal(reguaDoPlano('starter'), null);
  assert.equal(reguaDoPlano('pro')?.length, 2);
  assert.equal(reguaDoPlano('enterprise'), REGUA_PADRAO);
});

test('régua: dispara lembrete 3 dias antes do vencimento', () => {
  const r = recebivel('r1', 350, 'Maria', '2026-07-03'); // vence dia 3
  const msgs = dunningParaRecebivel('t', r, REGUA_PADRAO, new Date('2026-06-30T09:00:00Z')); // hoje = -3
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].tom, 'lembrete');
  assert.equal(msgs[0].params[0], 'Maria');
});

test('régua: recebível já recebido não gera cobrança; opt-out silencia tudo', () => {
  const recebido = recebivel('r1', 350, 'Maria', '2026-07-03', 'recebido');
  assert.equal(dunningParaRecebivel('t', recebido, REGUA_PADRAO, new Date('2026-06-30T09:00:00Z')).length, 0);

  const tenant: Tenant = {
    id: 't', nome: 'T', setor: 's', faixaFaturamento: 'pequena', plano: 'enterprise',
    consenteAprendizadoAgregado: false, whatsappOptIn: false, criadoEm: '2026-06-01',
  };
  assert.equal(cobrancasDoDia(tenant, [recebivel('r2', 350, 'Maria', '2026-07-03')], new Date('2026-06-30T09:00:00Z')).length, 0);
});

test('normalizeName remove acento e ruído', () => {
  assert.equal(normalizeName('  Padaria  Pão & Cia! '), 'padaria pao cia');
});
