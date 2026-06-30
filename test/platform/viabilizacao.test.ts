/**
 * viabilizacao.test.ts — O DG viabiliza a oportunidade e devolve a decisão ao dono.
 *
 * Cobre: restrições, opções, PRAZO de entrega (torna opções inviáveis), recomendação
 * dinâmica por PERFIL DE RISCO, projeção (lucro/prejuízo), valor estratégico, o resumo
 * no formato do WhatsApp, gating, inferência de perfil, e a retroalimentação da base.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { gerarBrief } from '../../src/dg/viabilizacao.js';
import { gerarBriefViabilizacao, registrarDecisao, consolidarAprendizados, inferirPerfilRisco } from '../../src/services/viabilizacaoService.js';
import { FeatureLockedError } from '../../src/core/entitlements.js';
import { MemoryStore } from '../../src/store/memoryStore.js';
import { KnowledgeBase } from '../../src/dg/rag.js';
import { MIN_TENANTS } from '../../src/learning/anonymization.js';
import type { Lead, PerfilRisco, PlanKey, Tenant } from '../../src/core/types.js';

const now = new Date('2026-06-30T12:00:00Z');

const lead = (over: Partial<Lead> = {}): Lead => ({
  id: 'l1', tenantId: 't', nome: 'Escola Crescer', estagio: 'qualificado',
  valorPotencial: 10000, ticketMedio: 1500, historico: [{ data: '2026-06-18', nota: 'orçamento' }, { data: '2026-06-20', nota: 'retorno' }],
  criadoEm: '2026-06-18', ...over,
});

const base = (over: Partial<Parameters<typeof gerarBrief>[0]> = {}) => ({
  lead: lead(), capacidadeMensalR$: 6000, saldoAtualR$: 50000, custoVariavelPct: 0.5,
  perfilRisco: 'equilibrado' as PerfilRisco, ...over,
});

test('viabilização: detecta restrição de capacidade e projeta lucro por opção', () => {
  const brief = gerarBrief(base());
  assert.equal(brief.podeAtenderHoje, false);
  assert.ok(brief.restricoes.some((r) => r.tipo === 'capacidade_entrega'));
  assert.equal(brief.opcoes.length, 3);
  assert.equal(brief.projecaoPorOpcao.B.resultadoR$, 5000); // 10000 - 5000 (50%)
  assert.equal(brief.recomendacao?.decisao, 'atender');
});

test('viabilização: capital de giro → opção C (adiantamento) entra no plano', () => {
  const brief = gerarBrief(base({ capacidadeMensalR$: 50000, saldoAtualR$: 1000, custoVariavelPct: 0.6 }));
  assert.ok(brief.restricoes.some((r) => r.tipo === 'capital_de_giro'));
  assert.equal(brief.recomendacao?.decisao, 'atender');
  assert.ok(brief.recomendacao?.opcoes.includes('C'));
});

test('PRAZO: faseamento que demora mais que o prazo é INVIÁVEL', () => {
  // demanda 18000, capacidade 6000/mês → faseamento (B) leva ~3 ciclos = 90 dias.
  // prazo do cliente = 40 dias → B não cabe; só terceirizar (A, ~35d) cabe.
  const brief = gerarBrief(base({ lead: lead({ valorPotencial: 18000 }), capacidadeMensalR$: 6000, prazoEntregaDias: 40 }));
  const B = brief.opcoes.find((o) => o.chave === 'B')!;
  const A = brief.opcoes.find((o) => o.chave === 'A')!;
  assert.equal(B.cabeNoPrazo, false);
  assert.equal(A.cabeNoPrazo, true);
  // A recomendação não pode ser um plano que use B (estouraria o prazo).
  assert.ok(!brief.recomendacao?.opcoes.includes('B'));
});

test('PRAZO: se nada cabe no prazo, o DG recomenda RENEGOCIAR (não empurra problema)', () => {
  // demanda 18000, capacidade 6000 → A ~35d, B ~90d; prazo = 10 dias → nada cabe.
  const brief = gerarBrief(base({ lead: lead({ valorPotencial: 18000 }), capacidadeMensalR$: 6000, prazoEntregaDias: 10 }));
  assert.equal(brief.recomendacao?.decisao, 'renegociar_prazo');
  assert.match(brief.resumoParaWhatsApp, /RENEGOCIAR O PRAZO/);
});

test('PERFIL: conservador recusa risco/margem fina; arrojado topa a mesma oportunidade', () => {
  // margem fina + risco: demanda grande, custo alto. Mesmos dados, perfis diferentes.
  const dados = { lead: lead({ valorPotencial: 12000 }), capacidadeMensalR$: 5000, saldoAtualR$: 50000, custoVariavelPct: 0.8, prazoEntregaDias: 45 };
  const conservador = gerarBrief({ ...dados, perfilRisco: 'conservador' });
  const arrojado = gerarBrief({ ...dados, perfilRisco: 'arrojado' });
  assert.notEqual(conservador.recomendacao?.decisao, arrojado.recomendacao?.decisao);
  assert.equal(arrojado.recomendacao?.decisao, 'atender');
  assert.equal(conservador.recomendacao?.decisao, 'recusar');
});

test('viabilização: resumo segue o formato pedido (porquê, opções, recomendação, números, decisão do dono)', () => {
  const brief = gerarBrief(base({ setorTicketMedioR$: 1000 }));
  const r = brief.resumoParaWhatsApp;
  assert.match(r, /NÃO consegue atender porque/);
  assert.match(r, /as opções são:/);
  assert.match(r, /minha recomendação/i);
  assert.match(r, /de faturamento, .* de custo e .* de (lucro|PREJUÍZO)/);
  assert.match(r, /A decisão é sua/);
  assert.equal(brief.decisaoNaMaoDoEmpresario, true);
});

test('viabilização: quando dá para atender hoje, não há restrição nem opções', () => {
  const brief = gerarBrief(base({ lead: lead({ valorPotencial: 2000 }), capacidadeMensalR$: 50000 }));
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

test('perfil inferido: caixa apertado → conservador; informado pelo dono vence', () => {
  const store = makeStore('pro');
  // saída média ~3000/mês, saldo baixo → folga < 1 → conservador.
  store.addTransaction({ id: 'd1', tenantId: 't', kind: 'despesa', valor: 3000, data: '2026-06-05', origem: 'portal', conciliado: true, criadoEm: '' });
  store.addTransaction({ id: 'r1', tenantId: 't', kind: 'receita', valor: 1000, data: '2026-06-10', origem: 'whatsapp', conciliado: true, criadoEm: '' });
  assert.equal(inferirPerfilRisco(store, 't', now).perfil, 'conservador');

  const store2 = makeStore('pro', { perfilRisco: 'arrojado' });
  const inf = inferirPerfilRisco(store2, 't', now);
  assert.equal(inf.perfil, 'arrojado');
  assert.equal(inf.origem, 'informado');
});

test('retroalimentação: decisão alimenta a base só com consentimento + limiar N≥MIN', () => {
  const kb = new KnowledgeBase();
  const baseStore = new MemoryStore();
  for (let i = 0; i < MIN_TENANTS; i++) {
    baseStore.createTenant({
      id: `t${i}`, nome: 'T', setor: 'alimentacao_varejo', faixaFaturamento: 'pequena', plano: 'enterprise',
      consenteAprendizadoAgregado: true, whatsappOptIn: true, criadoEm: '2026-06-01',
    });
    const l = baseStore.addLead(lead({ id: `l${i}`, tenantId: `t${i}` }));
    registrarDecisao(baseStore, `t${i}`, l.id, 'A', 'ganho', now);
  }
  const out = consolidarAprendizados(baseStore, kb);
  assert.equal(out.sinaisConsiderados, MIN_TENANTS);
  assert.equal(out.padroesPublicados, 1);
  assert.equal(kb.size('kb_aprendizado_anon'), 1);
});

test('retroalimentação: sem consentimento, nada é publicado', () => {
  const kb = new KnowledgeBase();
  const baseStore = new MemoryStore();
  for (let i = 0; i < MIN_TENANTS; i++) {
    baseStore.createTenant({
      id: `t${i}`, nome: 'T', setor: 's', faixaFaturamento: 'micro', plano: 'enterprise',
      consenteAprendizadoAgregado: false, whatsappOptIn: true, criadoEm: '2026-06-01',
    });
    const l = baseStore.addLead(lead({ id: `l${i}`, tenantId: `t${i}` }));
    registrarDecisao(baseStore, `t${i}`, l.id, 'A', 'ganho', now);
  }
  assert.equal(consolidarAprendizados(baseStore, kb).padroesPublicados, 0);
});
