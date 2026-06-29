/**
 * core.test.ts — Testes da camada crítica (PROMPT MESTRE 8.6):
 * extração de intenção, gating por plano, jornada e finanças.
 *
 * Rode: npm test  (node --experimental-strip-types --test test/platform/*.test.ts)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseExtraction, needsConfirmation } from '../../src/dg/extraction.js';
import { hasFeature, meetsLevel, requireFeature, FeatureLockedError, minPlanFor } from '../../src/core/entitlements.js';
import { createJourney, advance, journeySummary, planoPriorizado } from '../../src/core/journey.js';
import { computeKPIs, projectCash } from '../../src/core/finance.js';
import type { Payable, Receivable, Transaction } from '../../src/core/types.js';

test('extração: parser tolerante extrai lançamento de receita pix', () => {
  const raw = 'Aqui está: {"intent":"lancamento","kind":"receita","valor":350,"contraparte":"Maria","metodo":"pix","confianca":0.9}';
  const e = parseExtraction(raw);
  assert.equal(e.intent, 'lancamento');
  assert.equal(e.kind, 'receita');
  assert.equal(e.valor, 350);
  assert.equal(e.metodo, 'pix');
  assert.equal(needsConfirmation(e), false);
});

test('extração: confiança baixa ou valor ausente pede confirmação', () => {
  const e = parseExtraction('{"intent":"lancamento","kind":"despesa","valor":null,"confianca":0.9}');
  assert.equal(needsConfirmation(e), true);
  const e2 = parseExtraction('{"intent":"lancamento","kind":"despesa","valor":100,"confianca":0.2}');
  assert.equal(needsConfirmation(e2), true);
});

test('extração: lixo retorna intent outro com confiança 0', () => {
  assert.deepEqual(parseExtraction('sem json aqui'), { intent: 'outro', confianca: 0 });
});

test('entitlements: gating por plano respeita a matriz 7.1', () => {
  assert.equal(hasFeature('starter', 'whatsapp_lancamento_audio'), false);
  assert.equal(hasFeature('pro', 'whatsapp_lancamento_audio'), true);
  assert.equal(meetsLevel('enterprise', 'notificacoes_caixa', 'priority'), true);
  assert.equal(meetsLevel('pro', 'notificacoes_caixa', 'priority'), false);
  assert.equal(minPlanFor('crm_agenda'), 'pro');
});

test('entitlements: requireFeature lança FeatureLockedError com upgrade sugerido', () => {
  assert.throws(
    () => requireFeature('starter', 'whatsapp_lancamento_audio'),
    (e: unknown) => e instanceof FeatureLockedError && e.upgradeTo === 'pro',
  );
});

test('journey: avança e prioriza plano por impacto no resultado (Regra nº 8)', () => {
  let j = createJourney('t1', '2026-06-01T00:00:00Z');
  assert.equal(j.stage, 'diagnostico');
  j = advance(j, 'diagnóstico concluído', '2026-06-02T00:00:00Z');
  assert.equal(j.stage, 'orientacao');
  assert.equal(j.historico.length, 1);
  j.plano = [
    { id: 'a', acao: 'pequeno', responsavel: 'dono', prazo: '2026-07-01', metricaSucesso: 'x', impactoEstimadoR$: 200, status: 'pendente' },
    { id: 'b', acao: 'grande', responsavel: 'dono', prazo: '2026-07-01', metricaSucesso: 'y', impactoEstimadoR$: 5000, status: 'pendente' },
  ];
  assert.equal(planoPriorizado(j)[0].id, 'b');
  assert.match(journeySummary(j), /Orientação/);
});

test('finance: KPIs e projeção de caixa detectam dia negativo', () => {
  const now = new Date('2026-06-29T00:00:00Z');
  const txns: Transaction[] = [
    { id: '1', tenantId: 't', kind: 'receita', valor: 1000, data: '2026-06-10', origem: 'whatsapp', conciliado: true, criadoEm: '' },
    { id: '2', tenantId: 't', kind: 'despesa', valor: 300, data: '2026-06-12', origem: 'portal', conciliado: true, criadoEm: '' },
  ];
  const k = computeKPIs(txns, [], [], now);
  assert.equal(k.entrouMes, 1000);
  assert.equal(k.sobrouMes, 700);
  assert.equal(k.saldoAtual, 700);

  const recs: Receivable[] = [];
  const pays: Payable[] = [{ id: 'p', tenantId: 't', fornecedor: 'X', valor: 2000, vencimento: '2026-07-02', status: 'aberto', criadoEm: '' }];
  const proj = projectCash(700, recs, pays, now, 30);
  assert.equal(proj.primeiroDiaNegativo, '2026-07-02');
});
