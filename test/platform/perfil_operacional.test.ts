/**
 * perfil_operacional.test.ts — O DG aprende a operação do cliente da conversa e o
 * prazo passa a ser fiel a cada cliente (dinâmico, não default global).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseExtraction } from '../../src/dg/extraction.js';
import { aplicarInfoOperacional } from '../../src/services/perfilOperacionalService.js';
import { gerarBriefViabilizacao } from '../../src/services/viabilizacaoService.js';
import { handleInbound } from '../../src/pipeline.js';
import { MemoryStore } from '../../src/store/memoryStore.js';
import { KnowledgeBase } from '../../src/dg/rag.js';
import { createMockClaudeClient } from '../../src/dg/anthropic.js';
import { mockExtractionResponder } from '../../src/dg/mockResponder.js';
import type { PlanKey, Tenant } from '../../src/core/types.js';

const now = new Date('2026-06-30T12:00:00Z');

function makeStore(plano: PlanKey): MemoryStore {
  const store = new MemoryStore();
  const tenant: Tenant = {
    id: 't', nome: 'T', setor: 'servicos', faixaFaturamento: 'pequena', plano,
    consenteAprendizadoAgregado: false, whatsappOptIn: true, custoVariavelPct: 0.5,
    capacidadeMensalInformadaR$: 6000, criadoEm: '2026-06-01',
  };
  store.createTenant(tenant);
  return store;
}

test('extração: reconhece info_operacional (ciclo de entrega em dias)', () => {
  const e = parseExtraction('{"intent":"info_operacional","cicloEntregaDias":20,"capacidadeMensalR$":7000,"custoVariavelPct":0.55,"confianca":0.9}');
  assert.equal(e.intent, 'info_operacional');
  assert.equal(e.cicloEntregaDias, 20);
  assert.equal(e.capacidadeMensalR$, 7000);
  assert.equal(e.custoVariavelPct, 0.55);
});

test('serviço: aplica fatos operacionais ao perfil do tenant com proveniência', () => {
  const store = makeStore('pro');
  const out = aplicarInfoOperacional(store, 't', { intent: 'info_operacional', cicloEntregaDias: 15, capacidadeMensalR$: 9000, confianca: 0.9 }, now);
  assert.ok(out.atualizou.length >= 2);
  const t = store.getTenant('t')!;
  assert.equal(t.cicloEntregaDias, 15);
  assert.equal(t.capacidadeMensalInformadaR$, 9000);
  assert.ok(t.perfilOperacional);
  assert.equal(t.perfilOperacional!.notas[0].origem, 'conversa');
});

test('prazo dinâmico: ciclo aprendido muda a viabilidade do faseamento', () => {
  const store = makeStore('pro');
  // demanda 18000, capacidade 6000 → 3 ciclos. Prazo do cliente: 50 dias.
  const l = store.addLead({ id: 'l1', tenantId: 't', nome: 'Cliente X', estagio: 'qualificado', valorPotencial: 18000, prazoEntregaDias: 50, historico: [], criadoEm: '' });

  // Sem aprender nada → ciclo default 30 → faseamento 90 dias → NÃO cabe em 50.
  const antes = gerarBriefViabilizacao(store, 't', l.id, now);
  assert.equal(antes.opcoes.find((o) => o.chave === 'B')!.cabeNoPrazo, false);

  // DG aprende que o ciclo deste cliente é 15 dias → faseamento 45 dias → CABE em 50.
  aplicarInfoOperacional(store, 't', { intent: 'info_operacional', cicloEntregaDias: 15, confianca: 0.9 }, now);
  const depois = gerarBriefViabilizacao(store, 't', l.id, now);
  assert.equal(depois.opcoes.find((o) => o.chave === 'B')!.cabeNoPrazo, true);
});

test('pipeline: mensagem operacional ensina o DG e ele confirma', async () => {
  const store = makeStore('pro');
  const deps = { store, kb: new KnowledgeBase(), claude: createMockClaudeClient(mockExtractionResponder), now: () => now };
  const r = await handleInbound(deps, { tenantId: 't', fromWhatsapp: 'x', type: 'text', text: 'meu ciclo de produção é 20 dias', timestamp: now.toISOString() });
  assert.match(r.reply, /Aprendi sobre sua operação/);
  assert.equal(store.getTenant('t')!.cicloEntregaDias, 20);
});
