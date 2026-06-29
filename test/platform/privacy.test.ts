/**
 * privacy.test.ts — Testes da trava de privacidade entre tenants (Regra nº 7 + 5.4).
 *
 * Garante que: (a) só dado consentido entra; (b) PII é removida; (c) só publica
 * padrão com N≥MIN_TENANTS empresas distintas; (d) nada com PII atravessa a fronteira.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { scrubPII, containsPII, runLearningJob, learningsToChunks, MIN_TENANTS, type TenantSignal } from '../../src/learning/anonymization.js';
import { MemoryStore } from '../../src/store/memoryStore.js';

test('scrubPII remove CNPJ, e-mail, telefone e valores absolutos', () => {
  const s = scrubPII('Cliente 12.345.678/0001-99, email a@b.com, fone (11) 99999-8888, recebeu R$ 1.500,00 da Maria');
  assert.equal(containsPII(s), false);
  assert.match(s, /\[CNPJ\]/);
  assert.match(s, /\[EMAIL\]/);
  assert.match(s, /\[VALOR\]/);
});

test('learning job: só consentido + funcionou, e exige N≥MIN_TENANTS distintos', () => {
  const base = (tenantId: string): TenantSignal => ({
    tenantId, setor: 'alimentacao_varejo', faixa: 'pequena',
    observacao: 'regua de cobranca 3 dias antes melhorou recebimento',
    funcionou: true, consentido: true,
  });
  // Apenas (MIN_TENANTS - 1) empresas → não publica.
  const poucos = Array.from({ length: MIN_TENANTS - 1 }, (_, i) => base(`t${i}`));
  assert.equal(runLearningJob(poucos).length, 0);

  // MIN_TENANTS empresas distintas → publica 1 padrão.
  const muitos = Array.from({ length: MIN_TENANTS }, (_, i) => base(`t${i}`));
  const out = runLearningJob(muitos);
  assert.equal(out.length, 1);
  assert.equal(out[0].nTenants, MIN_TENANTS);
  // O padrão publicado vira chunk da coleção SEPARADA de aprendizado.
  assert.equal(learningsToChunks(out)[0].collection, 'kb_aprendizado_anon');
});

test('learning job: não-consentido nunca entra (opt-in, não opt-out)', () => {
  const sinais: TenantSignal[] = Array.from({ length: MIN_TENANTS }, (_, i) => ({
    tenantId: `t${i}`, setor: 's', faixa: 'micro', observacao: 'tatica X funcionou', funcionou: true, consentido: false,
  }));
  assert.equal(runLearningJob(sinais).length, 0);
});

test('learning job: padrão com PII residual não atravessa a fronteira', () => {
  // Mesmo consentido e com N suficiente, se a PII não puder ser removida, descarta.
  const sinais: TenantSignal[] = Array.from({ length: MIN_TENANTS }, (_, i) => ({
    tenantId: `t${i}`, setor: 's', faixa: 'micro',
    observacao: 'contato direto pelo email joao@empresa.com.br fechou negocio',
    funcionou: true, consentido: true,
  }));
  const out = runLearningJob(sinais);
  for (const l of out) assert.equal(containsPII(l.padrao), false);
});

test('store: isolamento por tenant — acesso a tenant inexistente falha', () => {
  const store = new MemoryStore();
  store.createTenant({
    id: 'a', nome: 'A', setor: 's', faixaFaturamento: 'micro', plano: 'starter',
    consenteAprendizadoAgregado: false, whatsappOptIn: true, criadoEm: '2026-06-01',
  });
  assert.throws(() => store.listTransactions('b'), /Tenant inexistente/);
  assert.equal(store.listTransactions('a').length, 0);
});
