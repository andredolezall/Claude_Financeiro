/**
 * viabilizacao.test.ts — O DG viabiliza a oportunidade e devolve a decisão ao dono.
 *
 * Cobre: detecção de restrições, opções A/B/C, recomendação, projeção (lucro/prejuízo),
 * valor estratégico, o resumo no formato do WhatsApp, gating, e a retroalimentação da
 * base (consentimento + limiar de anonimização).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { gerarBrief } from '../../src/dg/viabilizacao.js';
import { gerarBriefViabilizacao, registrarDecisao, consolidarAprendizados } from '../../src/services/viabilizacaoService.js';
import { FeatureLockedError } from '../../src/core/entitlements.js';
import { MemoryStore } from '../../src/store/memoryStore.js';
import { KnowledgeBase } from '../../src/dg/rag.js';
import { MIN_TENANTS } from '../../src/learning/anonymization.js';
import type { Lead, PlanKey, Tenant } from '../../src/core/types.js';

const now = new Date('2026-06-30T12:00:00Z');

const lead = (over: Partial<Lead> = {}): Lead => ({
  id: 'l1', tenantId: 't', nome: 'Escola Crescer', estagio: 'qualificado',
  valorPotencial: 10000, ticketMedio: 1500, historico: [{ data: '2026-06-18', nota: 'orçamento' }, { data: '2026-06-20', nota: 'retorno' }],
  criadoEm: '2026-06-18', ...over,
});

test('viabilização: detecta restrição de capacidade e projeta lucro', () => {
  const brief = gerarBrief({ lead: lead(), capacidadeMensalR$: 6000, saldoAtualR$: 50000, custoVariavelPct: 0.5 });
  assert.equal(brief.podeAtenderHoje, false);
  assert.ok(brief.restricoes.some((r) => r.tipo === 'capacidade_entrega'));
  assert.equal(brief.opcoes.length, 3); // A, B, C
  // Faturamento 10000, custo base 5000 (50%), opção B sem custo extra → lucro 5000.
  assert.equal(brief.projecaoPorOpcao.B.resultadoR$, 5000);
  assert.ok(brief.recomendacao);
});

test('viabilização: detecta restrição de capital de giro quando custo > caixa', () => {
  const brief = gerarBrief({ lead: lead(), capacidadeMensalR$: 50000, saldoAtualR$: 1000, custoVariavelPct: 0.6 });
  assert.ok(brief.restricoes.some((r) => r.tipo === 'capital_de_giro'));
  // Restrição de caixa → opção C (adiantamento) deve ser candidata e recomendada.
  assert.equal(brief.recomendacao?.opcao, 'C');
});

test('viabilização: opção cara dá prejuízo e o DG recomenda a que mantém no positivo', () => {
  const brief = gerarBrief({ lead: lead({ valorPotencial: 1000 }), capacidadeMensalR$: 100, saldoAtualR$: 50000, custoVariavelPct: 0.9 });
  // Terceirizar (A) destrói a margem fina → prejuízo nessa opção.
  assert.ok(brief.projecaoPorOpcao.A.resultadoR$ < 0);
  // O DG não recomenda destruir margem: escolhe B (faseamento), que mantém no positivo.
  assert.equal(brief.recomendacao?.opcao, 'B');
  assert.ok(brief.projecaoPorOpcao.B.resultadoR$ > 0);
});

test('viabilização: resumo segue o formato pedido (porquê, opções, recomendação, números, decisão do dono)', () => {
  const brief = gerarBrief({ lead: lead(), capacidadeMensalR$: 6000, saldoAtualR$: 50000, custoVariavelPct: 0.5, setorTicketMedioR$: 1000 });
  const r = brief.resumoParaWhatsApp;
  assert.match(r, /NÃO consegue atender porque/);
  assert.match(r, /as opções são:/);
  assert.match(r, /Minha recomendação é a [ABC]/);
  assert.match(r, /de faturamento, .* de custo e .* de (lucro|PREJUÍZO)/);
  assert.match(r, /A decisão é sua/);
  assert.match(r, /relevante/);
  assert.equal(brief.decisaoNaMaoDoEmpresario, true);
});

test('viabilização: quando dá para atender hoje, não há restrição nem opções', () => {
  const brief = gerarBrief({ lead: lead({ valorPotencial: 2000 }), capacidadeMensalR$: 50000, saldoAtualR$: 50000, custoVariavelPct: 0.5 });
  assert.equal(brief.podeAtenderHoje, true);
  assert.equal(brief.opcoes.length, 0);
  assert.equal(brief.recomendacao, null);
  assert.match(brief.resumoParaWhatsApp, /CONSEGUE atender/);
});

function makeStore(plano: PlanKey, over: Partial<Tenant> = {}): MemoryStore {
  const store = new MemoryStore();
  const tenant: Tenant = {
    id: 't', nome: 'T', setor: 'alimentacao_varejo', faixaFaturamento: 'pequena', plano,
    consenteAprendizadoAgregado: false, whatsappOptIn: true, custoVariavelPct: 0.5,
    capacidadeMensalInformadaR$: 6000, criadoEm: '2026-06-01', ...over,
  };
  store.createTenant(tenant);
  return store;
}

test('serviço: gating — Starter (dg_consultor limited) não tem viabilização', () => {
  const store = makeStore('starter');
  const l = store.addLead(lead());
  assert.throws(() => gerarBriefViabilizacao(store, 't', l.id, now), (e: unknown) => e instanceof FeatureLockedError);
});

test('serviço: Pro gera o brief usando capacidade informada e caixa do tenant', () => {
  const store = makeStore('pro');
  store.addTransaction({ id: 'tx', tenantId: 't', kind: 'receita', valor: 3000, data: '2026-06-10', origem: 'whatsapp', conciliado: true, criadoEm: '' });
  const l = store.addLead(lead());
  const brief = gerarBriefViabilizacao(store, 't', l.id, now);
  assert.equal(brief.podeAtenderHoje, false); // 10000 > 6000
  assert.ok(brief.recomendacao);
});

test('retroalimentação: decisão registra sinal; consolidação respeita consentimento e limiar', () => {
  // Sem consentimento → nada é publicado mesmo com muitos sinais.
  const kb = new KnowledgeBase();
  const stores = Array.from({ length: MIN_TENANTS }, (_, i) => {
    const s = makeStore('enterprise', { id: `t${i}`, consenteAprendizadoAgregado: false });
    // recria com id correto
    return s;
  });
  // Usa um único store multi-tenant para simular a base toda.
  const base = new MemoryStore();
  for (let i = 0; i < MIN_TENANTS; i++) {
    base.createTenant({
      id: `t${i}`, nome: 'T', setor: 'alimentacao_varejo', faixaFaturamento: 'pequena', plano: 'enterprise',
      consenteAprendizadoAgregado: true, whatsappOptIn: true, criadoEm: '2026-06-01',
    });
    const l = base.addLead(lead({ id: `l${i}`, tenantId: `t${i}` }));
    registrarDecisao(base, `t${i}`, l.id, 'A', 'ganho', now);
  }
  const out = consolidarAprendizados(base, kb);
  assert.equal(out.sinaisConsiderados, MIN_TENANTS);
  assert.equal(out.padroesPublicados, 1); // N≥MIN_TENANTS consentidos + funcionou
  assert.equal(kb.size('kb_aprendizado_anon'), 1);
  void stores;
});

test('retroalimentação: sem consentimento, nada é publicado', () => {
  const kb = new KnowledgeBase();
  const base = new MemoryStore();
  for (let i = 0; i < MIN_TENANTS; i++) {
    base.createTenant({
      id: `t${i}`, nome: 'T', setor: 's', faixaFaturamento: 'micro', plano: 'enterprise',
      consenteAprendizadoAgregado: false, whatsappOptIn: true, criadoEm: '2026-06-01',
    });
    const l = base.addLead(lead({ id: `l${i}`, tenantId: `t${i}` }));
    registrarDecisao(base, `t${i}`, l.id, 'A', 'ganho', now);
  }
  assert.equal(consolidarAprendizados(base, kb).padroesPublicados, 0);
});
