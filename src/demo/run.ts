/**
 * run.ts — Roteiro de demonstração ponta a ponta (sem chave de API, via mock).
 *
 * Mostra o "coração" do produto: mensagens de WhatsApp viram dado estruturado e
 * resposta do DG, e o dashboard mostra KPIs, jornada e alertas. PROMPT MESTRE 8.5.
 *
 * Rode: npm run demo   (ou: node --experimental-strip-types src/demo/run.ts)
 */

import { buildApp } from '../server.js';
import { handleInbound } from '../pipeline.js';
import { computeKPIs, projectCash } from '../core/finance.js';
import { buildAlerts } from '../notifications/engine.js';
import { journeySummary } from '../core/journey.js';
import { DEMO_TENANT_ID } from './seed.js';

async function main(): Promise<void> {
  const deps = buildApp();
  const tenantId = DEMO_TENANT_ID;
  const tenant = deps.store.getTenant(tenantId)!;

  const sep = (t: string) => console.log('\n' + '─'.repeat(70) + `\n${t}\n` + '─'.repeat(70));

  sep('1) PME de demonstração');
  console.log(`${tenant.nome} — setor ${tenant.setor}, faixa ${tenant.faixaFaturamento}, plano ${tenant.plano}`);

  sep('2) Mensagens de WhatsApp → IA → dado estruturado → resposta do DG');
  const mensagens = [
    'recebi 350 da Maria pelo pix',
    'paguei 600 de energia no boleto',
    'a Escola Crescer vai me pagar 1500 dia 10',
    'como faço pra melhorar meu caixa esse mês?',
  ];
  for (const text of mensagens) {
    const r = await handleInbound(deps, { tenantId, fromWhatsapp: '5511999990000', type: 'text', text, timestamp: new Date().toISOString() });
    console.log(`\n👤 ${text}`);
    console.log(`🤖 DG: ${r.reply}`);
    if (r.persisted) console.log(`   ↳ persistido: ${r.persisted.tipo}#${r.persisted.id}`);
  }

  sep('3) Dashboard — KPIs, previsão de caixa, alertas e jornada');
  const now = new Date('2026-06-29T12:00:00Z');
  const txns = deps.store.listTransactions(tenantId);
  const recs = deps.store.listReceivables(tenantId);
  const pays = deps.store.listPayables(tenantId);
  const kpis = computeKPIs(txns, recs, pays, now);
  console.log('KPIs:', kpis);
  const proj = projectCash(kpis.saldoAtual, recs, pays, now, 30);
  console.log('Primeiro dia de caixa negativo projetado:', proj.primeiroDiaNegativo ?? 'nenhum nos próximos 30 dias');
  console.log('\nAlertas (WhatsApp):');
  for (const a of buildAlerts({ tenant, txns, receivables: recs, payables: pays, now })) {
    console.log(` • [${a.type}] ${a.mensagem}`);
  }
  console.log('\nJornada:\n' + journeySummary(deps.store.getJourney(tenantId)));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
