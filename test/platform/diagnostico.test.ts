/**
 * diagnostico.test.ts — Testes do motor de diagnóstico do DG.
 *
 * Cobre o que decide resultado: detecção e QUANTIFICAÇÃO correta dos problemas,
 * ordenação por impacto (Regra nº 8) e persistência na jornada com avanço de etapa.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { diagnosticar, impactoTotal } from '../../src/dg/diagnostico.js';
import { gerarDiagnostico } from '../../src/services/diagnosticoService.js';
import { MemoryStore } from '../../src/store/memoryStore.js';
import type { Payable, Receivable, Tenant, Transaction } from '../../src/core/types.js';

const now = new Date('2026-06-30T12:00:00Z');

const tx = (id: string, kind: 'receita' | 'despesa', valor: number, data = '2026-06-10', contraparte?: string): Transaction => ({
  id, tenantId: 't', kind, valor, data, contraparte, origem: 'whatsapp', conciliado: false, criadoEm: data,
});
const rec = (id: string, valor: number, contraparte: string, vencimento: string, status: Receivable['status']): Receivable => ({
  id, tenantId: 't', contraparte, valor, vencimento, status, criadoEm: vencimento,
});
const pay = (id: string, valor: number, vencimento: string): Payable => ({
  id, tenantId: 't', fornecedor: 'F', valor, vencimento, status: 'aberto', criadoEm: '2026-06-01',
});

test('diagnóstico: detecta recebível atrasado e quantifica o valor parado', () => {
  const f = diagnosticar({ txns: [], receivables: [rec('r1', 950, 'Zé', '2026-06-25', 'atrasado')], payables: [], now });
  const atraso = f.find((x) => x.chave === 'recebiveis_atrasados');
  assert.ok(atraso);
  assert.equal(atraso!.impactoMensalR$, 950);
  assert.equal(atraso!.base, 'medido');
  assert.equal(atraso!.gravidade, 'alta');
});

test('diagnóstico: detecta queima de caixa (saiu mais que entrou no mês)', () => {
  const f = diagnosticar({
    txns: [tx('a', 'receita', 1000), tx('b', 'despesa', 2500)],
    receivables: [], payables: [], now,
  });
  const queima = f.find((x) => x.chave === 'queima_de_caixa');
  assert.ok(queima);
  assert.equal(queima!.impactoMensalR$, 1500);
});

test('diagnóstico: detecta risco de caixa negativo projetado', () => {
  const f = diagnosticar({
    txns: [tx('a', 'receita', 500)],
    receivables: [], payables: [pay('p1', 3000, '2026-07-05')], now,
  });
  assert.ok(f.find((x) => x.chave === 'risco_caixa_negativo'));
});

test('diagnóstico: achados saem ordenados por impacto (maior primeiro)', () => {
  const f = diagnosticar({
    txns: [tx('a', 'receita', 100), tx('b', 'despesa', 1200)], // queima 1100
    receivables: [rec('r1', 5000, 'X', '2026-06-20', 'atrasado')], // atraso 5000
    payables: [], now,
  });
  assert.ok(f.length >= 2);
  assert.equal(f[0].chave, 'recebiveis_atrasados'); // 5000 > 1100
  assert.equal(impactoTotal(f), f.reduce((s, x) => s + x.impactoMensalR$, 0));
});

test('diagnóstico: sem problemas → nenhum achado', () => {
  const f = diagnosticar({ txns: [tx('a', 'receita', 5000)], receivables: [], payables: [], now });
  assert.equal(f.length, 0);
});

function storeComProblema(): MemoryStore {
  const store = new MemoryStore();
  const tenant: Tenant = {
    id: 't', nome: 'T', setor: 's', faixaFaturamento: 'pequena', plano: 'pro',
    consenteAprendizadoAgregado: false, whatsappOptIn: true, criadoEm: '2026-06-01',
  };
  store.createTenant(tenant);
  store.addReceivable({ ...rec('r1', 950, 'Zé', '2026-06-25', 'atrasado'), tenantId: 't' });
  return store;
}

test('serviço: grava diagnóstico na jornada, propõe plano e avança para orientacao', () => {
  const store = storeComProblema();
  assert.equal(store.getJourney('t').stage, 'diagnostico');
  const out = gerarDiagnostico(store, 't', now);
  assert.ok(out.findings.length >= 1);
  assert.ok(out.planoProposto.length >= 1);
  assert.equal(out.planoProposto[0].impactoEstimadoR$, out.findings[0].impactoMensalR$);
  const j = store.getJourney('t');
  assert.equal(j.stage, 'orientacao');
  assert.equal(j.diagnosticos.length, out.findings.length);
  assert.ok(j.historico.length >= 1);
});

test('serviço: sem problemas não avança a jornada', () => {
  const store = new MemoryStore();
  store.createTenant({
    id: 't', nome: 'T', setor: 's', faixaFaturamento: 'micro', plano: 'starter',
    consenteAprendizadoAgregado: false, whatsappOptIn: true, criadoEm: '2026-06-01',
  });
  store.addTransaction({ ...tx('a', 'receita', 5000), tenantId: 't' });
  const out = gerarDiagnostico(store, 't', now);
  assert.equal(out.findings.length, 0);
  assert.equal(store.getJourney('t').stage, 'diagnostico');
});
