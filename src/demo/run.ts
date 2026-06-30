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
import { cobrancasDoDia } from '../notifications/regua.js';
import { conciliarTenant } from '../services/conciliacaoService.js';
import { gerarDiagnostico, narrarDiagnostico } from '../services/diagnosticoService.js';
import { confirmarOrientacao, iniciarExecucao, concluirAcao, medirResultado } from '../services/acompanhamentoService.js';
import { painelCRM, criarLead } from '../services/crmService.js';
import { suggestApproach } from '../crm/crm.js';
import { gerarBriefViabilizacao, registrarDecisao, consolidarAprendizados, inferirPerfilRisco } from '../services/viabilizacaoService.js';
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
    'recebi 1800 do Buffet da Praça pelo pix', // casa com o recebível em aberto (conciliação)
    'a Escola Crescer vai me pagar 1500 dia 3', // vence 03/07 → régua dispara lembrete hoje (-3)
    'como faço pra melhorar meu caixa esse mês?',
  ];
  for (const text of mensagens) {
    const r = await handleInbound(deps, { tenantId, fromWhatsapp: '5511999990000', type: 'text', text, timestamp: new Date().toISOString() });
    console.log(`\n👤 ${text}`);
    console.log(`🤖 DG: ${r.reply}`);
    if (r.persisted) console.log(`   ↳ persistido: ${r.persisted.tipo}#${r.persisted.id}`);
  }

  const now = new Date('2026-06-30T12:00:00Z');

  sep('3) Conciliação automática de recebíveis (elimina divergências)');
  const conc = conciliarTenant(deps.store, tenantId, now);
  console.log(`Modo: ${conc.modo} (plano ${tenant.plano})`);
  for (const b of conc.baixados) {
    console.log(` ✅ baixado: ${b.receivable.contraparte} ${b.receivable.valor} (confiança ${b.confidence}) ↔ tx ${b.transaction.id}`);
  }
  for (const m of conc.aRevisar) console.log(` 🔎 a revisar: ${m.receivable.contraparte} (${m.confidence})`);
  console.log(` Recebíveis ainda em aberto: ${conc.result.recebiveisEmAberto.length}`);

  sep('4) Régua de cobrança — mensagens devidas hoje');
  const cobrancas = cobrancasDoDia(tenant, deps.store.listReceivables(tenantId), now);
  if (!cobrancas.length) console.log(' (nenhuma cobrança programada para hoje)');
  for (const c of cobrancas) console.log(` • [${c.tom}] ${c.mensagem}`);

  sep('5) Diagnóstico do DG — o que está drenando resultado (quantificado)');
  const diag = gerarDiagnostico(deps.store, tenantId, now);
  console.log(diag.resumo);
  console.log(`\nPlano de ação proposto (priorizado por impacto):`);
  for (const p of diag.planoProposto) console.log(` • ${p.acao} — meta: ${p.metricaSucesso} (prazo ${p.prazo})`);
  const narracao = await narrarDiagnostico(deps.claude, deps.kb, deps.store, tenantId, diag.findings);
  console.log(`\n🤖 DG (narração didática):\n${narracao}`);

  sep('6) Dashboard — KPIs, previsão de caixa, alertas e jornada');
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

  sep('7) Do plano ao lucro — acompanhamento e medição do resultado (case)');
  confirmarOrientacao(deps.store, tenantId, now); // dono concorda
  iniciarExecucao(deps.store, tenantId, now); // começa a executar
  console.log('Etapa após iniciar execução:', deps.store.getJourney(tenantId).stage);
  // Simula a execução real: o recebível atrasado do Mercadinho foi cobrado e recebido.
  const atrasado = deps.store.listReceivables(tenantId).find((r) => r.status === 'atrasado');
  if (atrasado) { atrasado.status = 'recebido'; atrasado.recebidoEm = now.toISOString(); }
  for (const p of diag.planoProposto) concluirAcao(deps.store, tenantId, p.id, now);
  const resultado = medirResultado(deps.store, tenantId, now);
  console.log(`\n📈 ${resultado.case}`);
  console.log(`Etapa da jornada após medir (reinicia ciclo): ${resultado.etapaJornada}`);

  sep('8) CRM com agenda inteligente — oportunidade × capacidade');
  const painel = painelCRM(deps.store, tenantId, now);
  console.log(`Leads abertos: ${painel.leadsAbertos} | Pipeline: R$ ${painel.pipelineR$.toLocaleString('pt-BR')} | capacidade (${painel.capacidadeBaseadaEm})`);
  console.log(`Análise: ${painel.capacidade.mensagem}`);
  console.log('Follow-ups pendentes:');
  for (const f of painel.followUpsPendentes) console.log(` • ${f.titulo} (${f.quando.slice(0, 10)})`);
  // Sugestão de abordagem do DG (recurso Enterprise — demo é Pro: mostra o gating).
  const lead = deps.store.listLeads(tenantId)[0];
  const ab = await suggestApproach(deps.claude, deps.kb, tenant, deps.store.getJourney(tenantId), lead);
  console.log(`\n🤖 DG — abordagem para "${lead.nome}" (disponível: ${ab.disponivel}):\n${ab.sugestao}`);

  sep('9) Viabilização de oportunidade — prazo + perfil de risco, decisão do dono');
  // Oportunidade grande, acima da capacidade, com prazo apertado do cliente (45 dias).
  const grande = criarLead(deps.store, tenantId, { nome: 'Escola Crescer — contrato anual', valorPotencial: 14000, ticketMedio: 1500, prazoEntregaDias: 45 }, now);
  const perfilInf = inferirPerfilRisco(deps.store, tenantId, now);
  console.log(`Perfil de risco (${perfilInf.origem}): ${perfilInf.perfil} — ${perfilInf.motivo}\n`);
  const brief = gerarBriefViabilizacao(deps.store, tenantId, grande.id, now, { setorTicketMedioR$: 1000 });
  console.log(`🤖 DG (perfil ${brief.perfilRisco}):\n${brief.resumoParaWhatsApp}`);

  // Mesma oportunidade, perfil ARROJADO → recomendação muda (dinâmico por cliente).
  const briefArrojado = gerarBriefViabilizacao(deps.store, tenantId, grande.id, now, { setorTicketMedioR$: 1000, perfilRiscoOverride: 'arrojado' });
  console.log(`\n— Se a empresa fosse ARROJADA, a recomendação seria: ${briefArrojado.recomendacao?.decisao} (${briefArrojado.recomendacao?.rotulo ?? '—'}).`);
  console.log(`— Como ${brief.perfilRisco}, foi: ${brief.recomendacao?.decisao} (${brief.recomendacao?.rotulo ?? '—'}).`);

  // O dono decide (a decisão é dele) e avisa o DG → fortalece a base.
  const escolha = brief.recomendacao?.opcoes[0] ?? 'B';
  const decisao = registrarDecisao(deps.store, tenantId, grande.id, escolha, 'ganho', now, 'Fechei o contrato');
  console.log(`\n✔️ Decisão do dono registrada (consentimento p/ base agregada: ${decisao.consentido}).`);
  const consol = consolidarAprendizados(deps.store, deps.kb);
  console.log(`Base de aprendizado: ${consol.sinaisConsiderados} sinal(is), ${consol.padroesPublicados} padrão(ões) publicado(s) (limiar protege com N baixo).`);

  sep('10) Prazo DINÂMICO — o DG aprende a operação do cliente conversando');
  const lead2 = criarLead(deps.store, tenantId, { nome: 'Buffet Grande — evento', valorPotencial: 18000, prazoEntregaDias: 50 }, now);
  const antes = gerarBriefViabilizacao(deps.store, tenantId, lead2.id, now);
  const bAntes = antes.opcoes.find((o) => o.chave === 'B')!;
  console.log(`Antes de aprender (ciclo default 30d): faseamento entrega em ~${bAntes.tempoEntregaDias}d → cabe no prazo de 50d? ${bAntes.cabeNoPrazo}`);
  // O dono ensina o DG sobre a operação dele:
  const ensino = await handleInbound(deps, { tenantId, fromWhatsapp: '5511999990000', type: 'text', text: 'na verdade meu ciclo de produção é 15 dias e consigo entregar uns 9 mil por mês', timestamp: now.toISOString() });
  console.log(`\n👤 na verdade meu ciclo de produção é 15 dias e consigo entregar uns 9 mil por mês`);
  console.log(`🤖 DG: ${ensino.reply}`);
  const depois = gerarBriefViabilizacao(deps.store, tenantId, lead2.id, now);
  const bDepois = depois.opcoes.find((o) => o.chave === 'B')!;
  console.log(`\nDepois de aprender (ciclo 15d): faseamento entrega em ~${bDepois.tempoEntregaDias}d → cabe no prazo de 50d? ${bDepois.cabeNoPrazo}`);
  console.log('→ O mesmo cálculo de prazo agora é fiel à operação real deste cliente.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
