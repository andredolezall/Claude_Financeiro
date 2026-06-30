/**
 * acompanhamento.test.ts — Testes do arco Orientação→Plano→Acompanhamento→Resultado.
 *
 * Cobre: transições guardadas por etapa, conclusão de ações, cobrança de execução,
 * e a MEDIÇÃO do ganho (antes/depois) que vira o case de ROI.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { gerarDiagnostico } from '../../src/services/diagnosticoService.js';
import {
  confirmarOrientacao, iniciarExecucao, concluirAcao, progressoPlano,
  lembretesDeExecucao, medirResultado,
} from '../../src/services/acompanhamentoService.js';
import { MemoryStore } from '../../src/store/memoryStore.js';
import type { Receivable, Tenant } from '../../src/core/types.js';

const now = new Date('2026-06-30T12:00:00Z');

function storeComAtraso(): MemoryStore {
  const store = new MemoryStore();
  const tenant: Tenant = {
    id: 't', nome: 'T', setor: 's', faixaFaturamento: 'pequena', plano: 'pro',
    consenteAprendizadoAgregado: false, whatsappOptIn: true, criadoEm: '2026-06-01',
  };
  store.createTenant(tenant);
  const r: Receivable = { id: 'r1', tenantId: 't', contraparte: 'Zé', valor: 950, vencimento: '2026-06-25', status: 'atrasado', criadoEm: '2026-06-10' };
  store.addReceivable(r);
  return store;
}

test('arco: percorre orientacao → plano → acompanhamento com guardas de etapa', () => {
  const store = storeComAtraso();
  gerarDiagnostico(store, 't', now); // diagnostico → orientacao, fixa baseline
  assert.equal(store.getJourney('t').stage, 'orientacao');
  assert.ok((store.getJourney('t').baselineImpactoR$ ?? 0) > 0);

  confirmarOrientacao(store, 't', now);
  assert.equal(store.getJourney('t').stage, 'plano_de_acao');

  iniciarExecucao(store, 't', now);
  assert.equal(store.getJourney('t').stage, 'acompanhamento');
});

test('arco: transição fora de ordem falha (guarda de etapa)', () => {
  const store = storeComAtraso();
  gerarDiagnostico(store, 't', now); // está em orientacao
  assert.throws(() => iniciarExecucao(store, 't', now), /exige etapa "plano_de_acao"/);
});

test('acompanhamento: conclui ação e atualiza progresso', () => {
  const store = storeComAtraso();
  const diag = gerarDiagnostico(store, 't', now);
  confirmarOrientacao(store, 't', now);
  iniciarExecucao(store, 't', now);

  let prog = progressoPlano(store, 't');
  assert.equal(prog.concluidos, 0);
  assert.ok(prog.total >= 1);

  concluirAcao(store, 't', diag.planoProposto[0].id, now);
  prog = progressoPlano(store, 't');
  assert.equal(prog.concluidos, 1);
  assert.ok(prog.pct > 0);
});

test('acompanhamento: DG cobra ações pendentes próximas/atrasadas', () => {
  const store = storeComAtraso();
  gerarDiagnostico(store, 't', now);
  confirmarOrientacao(store, 't', now);
  iniciarExecucao(store, 't', now);
  // prazo do plano = now+7; cobramos com janela: simular "hoje" perto do prazo.
  const perto = new Date('2026-07-06T12:00:00Z');
  const lembretes = lembretesDeExecucao(store, 't', perto);
  assert.ok(lembretes.length >= 1);
  assert.match(lembretes[0].mensagem, /R\$/);
});

test('resultado: mede ganho antes/depois e reinicia o ciclo', () => {
  const store = storeComAtraso();
  gerarDiagnostico(store, 't', now);
  const antes = store.getJourney('t').baselineImpactoR$!;
  assert.ok(antes >= 950);
  confirmarOrientacao(store, 't', now);
  iniciarExecucao(store, 't', now);

  // Simula execução real: o recebível atrasado foi recebido (problema some).
  const r = store.listReceivables('t')[0];
  r.status = 'recebido';
  r.recebidoEm = now.toISOString();

  const resultado = medirResultado(store, 't', now);
  assert.ok(resultado.ganhoMensalR$ >= 950);
  assert.ok(resultado.depoisR$ < antes);
  assert.equal(resultado.etapaJornada, 'diagnostico'); // reiniciou o ciclo
  assert.match(resultado.case, /Ganho recuperado/);
  // Baseline e resultado do ciclo anterior foram zerados no restart.
  assert.equal(store.getJourney('t').baselineImpactoR$, undefined);
});

test('resultado: medir fora do acompanhamento falha', () => {
  const store = storeComAtraso();
  gerarDiagnostico(store, 't', now); // orientacao
  assert.throws(() => medirResultado(store, 't', now), /exige etapa "acompanhamento"/);
});
