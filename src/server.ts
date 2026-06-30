/**
 * server.ts — Servidor HTTP do MVP (zero dependências: node:http).
 *
 * Expõe:
 *  - GET  /webhook/whatsapp        → verificação do webhook (hub.challenge).
 *  - POST /webhook/whatsapp        → recebe mensagens (valida assinatura) e roda o pipeline.
 *  - GET  /api/tenants/:id/dashboard → KPIs + jornada + alertas (portal/dashboard).
 *  - POST /api/tenants/:id/message   → simula uma mensagem (texto) — útil para a demo/testes.
 *  - GET  /health
 *
 * Em produção troca-se node:http por um framework e adiciona-se auth/RLS, mas a lógica
 * de domínio (pipeline, finance, entitlements) é a mesma.
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { MemoryStore } from './store/memoryStore.js';
import { KnowledgeBase } from './dg/rag.js';
import { createClaudeClient, createMockClaudeClient, type ClaudeClient } from './dg/anthropic.js';
import { handleInbound } from './pipeline.js';
import { computeKPIs, projectCash } from './core/finance.js';
import { buildAlerts } from './notifications/engine.js';
import { cobrancasDoDia } from './notifications/regua.js';
import { conciliarTenant } from './services/conciliacaoService.js';
import { gerarDiagnostico } from './services/diagnosticoService.js';
import { confirmarOrientacao, iniciarExecucao, concluirAcao, medirResultado, progressoPlano, lembretesDeExecucao } from './services/acompanhamentoService.js';
import { painelCRM, criarLead } from './services/crmService.js';
import { gerarBriefViabilizacao, registrarDecisao, consolidarAprendizados } from './services/viabilizacaoService.js';
import { journeySummary } from './core/journey.js';
import { PLANS, hasFeature, FeatureLockedError } from './core/entitlements.js';
import { loadWhatsAppConfig, verifyWebhook, validateSignature, parseInbound } from './whatsapp/cloudApi.js';
import { seedDemoTenant, seedKnowledgeBase } from './demo/seed.js';
import { DGR_CONSTITUTION } from './core/dgr_constitution.js';
import { mockExtractionResponder } from './dg/mockResponder.js';

export interface AppDeps {
  store: MemoryStore;
  kb: KnowledgeBase;
  claude: ClaudeClient;
}

/** Monta a aplicação com a PME de demonstração já populada. */
export function buildApp(): AppDeps {
  const store = new MemoryStore();
  const kb = new KnowledgeBase();
  seedDemoTenant(store);
  seedKnowledgeBase(kb);
  // Sem ANTHROPIC_API_KEY, usa cliente mock determinístico (demo sem custo).
  const claude = process.env.ANTHROPIC_API_KEY
    ? createClaudeClient()
    : createMockClaudeClient(mockExtractionResponder);
  return { store, kb, claude };
}

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(payload);
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString('utf-8');
}

export function createApp(deps: AppDeps) {
  const wa = loadWhatsAppConfig();

  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const path = url.pathname;

      if (path === '/health') return json(res, 200, { ok: true, motto: DGR_CONSTITUTION.motto });

      // --- WhatsApp webhook ---
      if (path === '/webhook/whatsapp' && req.method === 'GET') {
        if (!wa) return json(res, 503, { error: 'WhatsApp não configurado (.env).' });
        const challenge = verifyWebhook(wa, {
          mode: url.searchParams.get('hub.mode') ?? undefined,
          token: url.searchParams.get('hub.verify_token') ?? undefined,
          challenge: url.searchParams.get('hub.challenge') ?? undefined,
        });
        if (challenge === null) return json(res, 403, { error: 'verify token inválido' });
        res.writeHead(200, { 'content-type': 'text/plain' });
        return res.end(challenge);
      }
      if (path === '/webhook/whatsapp' && req.method === 'POST') {
        if (!wa) return json(res, 503, { error: 'WhatsApp não configurado (.env).' });
        const raw = await readBody(req);
        if (!validateSignature(wa, raw, req.headers['x-hub-signature-256'] as string)) {
          return json(res, 401, { error: 'assinatura inválida' });
        }
        const inbound = parseInbound(JSON.parse(raw));
        // Resolução de tenant por número do remetente fica a cargo do mapeamento real;
        // aqui respondemos 200 rápido (a Meta exige) e o processamento seria enfileirado.
        return json(res, 200, { received: inbound.length });
      }

      // --- Dashboard do tenant ---
      const dash = path.match(/^\/api\/tenants\/([^/]+)\/dashboard$/);
      if (dash && req.method === 'GET') {
        const tenantId = decodeURIComponent(dash[1]);
        const tenant = deps.store.getTenant(tenantId);
        if (!tenant) return json(res, 404, { error: 'tenant não encontrado' });
        const now = new Date();
        const txns = deps.store.listTransactions(tenantId);
        const recs = deps.store.listReceivables(tenantId);
        const pays = deps.store.listPayables(tenantId);
        const kpis = computeKPIs(txns, recs, pays, now);
        const proj = projectCash(kpis.saldoAtual, recs, pays, now, 30);
        const alerts = buildAlerts({ tenant, txns, receivables: recs, payables: pays, now });
        const cobrancas = cobrancasDoDia(tenant, recs, now);
        return json(res, 200, {
          tenant: { id: tenant.id, nome: tenant.nome, plano: PLANS[tenant.plano].nome },
          kpis,
          previsaoCaixa: { primeiroDiaNegativo: proj.primeiroDiaNegativo, serie: proj.serie },
          jornada: journeySummary(deps.store.getJourney(tenantId)),
          progressoPlano: progressoPlano(deps.store, tenantId),
          lembretesExecucao: lembretesDeExecucao(deps.store, tenantId, now),
          resultado: deps.store.getJourney(tenantId).resultado ?? null,
          alertas: alerts,
          cobrancasHoje: cobrancas,
          crm: hasFeature(tenant.plano, 'crm_agenda') ? painelCRM(deps.store, tenantId, now) : null,
        });
      }

      // --- CRM: criar lead ---
      const leads = path.match(/^\/api\/tenants\/([^/]+)\/leads$/);
      if (leads && req.method === 'POST') {
        const tenantId = decodeURIComponent(leads[1]);
        if (!deps.store.getTenant(tenantId)) return json(res, 404, { error: 'tenant não encontrado' });
        const body = JSON.parse((await readBody(req)) || '{}') as { nome?: string; valorPotencial?: number; contato?: string; ticketMedio?: number };
        if (!body.nome || body.valorPotencial == null) return json(res, 400, { error: 'nome e valorPotencial obrigatórios' });
        try {
          const lead = criarLead(deps.store, tenantId, { nome: body.nome, valorPotencial: body.valorPotencial, contato: body.contato, ticketMedio: body.ticketMedio }, new Date());
          return json(res, 201, { id: lead.id, estagio: lead.estagio });
        } catch (e) {
          if (e instanceof FeatureLockedError) return json(res, 402, { error: e.message, upgradeTo: e.upgradeTo });
          throw e;
        }
      }

      // --- Avanço do arco "Do Diagnóstico ao Lucro" ---
      const jornada = path.match(/^\/api\/tenants\/([^/]+)\/jornada\/([^/]+)$/);
      if (jornada && req.method === 'POST') {
        const tenantId = decodeURIComponent(jornada[1]);
        const acao = jornada[2];
        if (!deps.store.getTenant(tenantId)) return json(res, 404, { error: 'tenant não encontrado' });
        const now = new Date();
        try {
          if (acao === 'confirmar-orientacao') return json(res, 200, { stage: confirmarOrientacao(deps.store, tenantId, now).stage });
          if (acao === 'iniciar-execucao') return json(res, 200, { stage: iniciarExecucao(deps.store, tenantId, now).stage });
          if (acao === 'medir-resultado') return json(res, 200, medirResultado(deps.store, tenantId, now));
          if (acao === 'concluir-acao') {
            const body = JSON.parse((await readBody(req)) || '{}') as { planoItemId?: string };
            if (!body.planoItemId) return json(res, 400, { error: 'planoItemId obrigatório' });
            const j = concluirAcao(deps.store, tenantId, body.planoItemId, now);
            return json(res, 200, { progresso: progressoPlano(deps.store, tenantId), stage: j.stage });
          }
          return json(res, 404, { error: `ação de jornada desconhecida: ${acao}` });
        } catch (e) {
          return json(res, 409, { error: (e as Error).message });
        }
      }

      // --- Conciliação de recebíveis (aplica baixas conforme o plano) ---
      const conc = path.match(/^\/api\/tenants\/([^/]+)\/conciliar$/);
      if (conc && req.method === 'POST') {
        const tenantId = decodeURIComponent(conc[1]);
        const tenant = deps.store.getTenant(tenantId);
        if (!tenant) return json(res, 404, { error: 'tenant não encontrado' });
        const out = conciliarTenant(deps.store, tenantId, new Date());
        return json(res, 200, {
          modo: out.modo,
          baixados: out.baixados.map((m) => ({ recebivel: m.receivable.id, contraparte: m.receivable.contraparte, valor: m.receivable.valor, confianca: m.confidence })),
          aRevisar: out.aRevisar.map((m) => ({ recebivel: m.receivable.id, confianca: m.confidence })),
          recebiveisEmAberto: out.result.recebiveisEmAberto.length,
          receitasSemRecebivel: out.result.receitasSemRecebivel.length,
        });
      }

      // --- Diagnóstico do DG (gera achados quantificados + plano + avança jornada) ---
      const diag = path.match(/^\/api\/tenants\/([^/]+)\/diagnostico$/);
      if (diag && req.method === 'POST') {
        const tenantId = decodeURIComponent(diag[1]);
        const tenant = deps.store.getTenant(tenantId);
        if (!tenant) return json(res, 404, { error: 'tenant não encontrado' });
        const out = gerarDiagnostico(deps.store, tenantId, new Date());
        return json(res, 200, {
          impactoTotalR$: out.impactoTotalR$,
          etapaJornada: out.journeyStage,
          achados: out.findings,
          planoProposto: out.planoProposto,
          resumo: out.resumo,
        });
      }

      // --- Viabilização de oportunidade (brief do DG) ---
      const viab = path.match(/^\/api\/tenants\/([^/]+)\/leads\/([^/]+)\/viabilizar$/);
      if (viab && req.method === 'POST') {
        const tenantId = decodeURIComponent(viab[1]);
        if (!deps.store.getTenant(tenantId)) return json(res, 404, { error: 'tenant não encontrado' });
        try {
          const brief = gerarBriefViabilizacao(deps.store, tenantId, decodeURIComponent(viab[2]), new Date());
          return json(res, 200, brief);
        } catch (e) {
          if (e instanceof FeatureLockedError) return json(res, 402, { error: e.message, upgradeTo: e.upgradeTo });
          return json(res, 400, { error: (e as Error).message });
        }
      }

      // --- Registro da decisão do dono (alimenta a base) ---
      const dec = path.match(/^\/api\/tenants\/([^/]+)\/leads\/([^/]+)\/decisao$/);
      if (dec && req.method === 'POST') {
        const tenantId = decodeURIComponent(dec[1]);
        if (!deps.store.getTenant(tenantId)) return json(res, 404, { error: 'tenant não encontrado' });
        const body = JSON.parse((await readBody(req)) || '{}') as { opcao?: string; resultado?: 'ganho' | 'perdido' | 'pendente'; observacao?: string };
        if (!body.opcao) return json(res, 400, { error: 'opcao obrigatória' });
        try {
          const out = registrarDecisao(deps.store, tenantId, decodeURIComponent(dec[2]), body.opcao, body.resultado ?? 'pendente', new Date(), body.observacao);
          return json(res, 200, { sinalRegistrado: out.sinalRegistrado, consentido: out.consentido });
        } catch (e) {
          return json(res, 400, { error: (e as Error).message });
        }
      }

      // --- Consolidação offline dos aprendizados anonimizados (job global) ---
      if (path === '/api/aprendizados/consolidar' && req.method === 'POST') {
        return json(res, 200, consolidarAprendizados(deps.store, deps.kb));
      }

      // --- Mensagem simulada (texto) ---
      const msg = path.match(/^\/api\/tenants\/([^/]+)\/message$/);
      if (msg && req.method === 'POST') {
        const tenantId = decodeURIComponent(msg[1]);
        const tenant = deps.store.getTenant(tenantId);
        if (!tenant) return json(res, 404, { error: 'tenant não encontrado' });
        const body = JSON.parse((await readBody(req)) || '{}') as { text?: string };
        const result = await handleInbound(deps, {
          tenantId, fromWhatsapp: 'demo', type: 'text', text: body.text ?? '', timestamp: new Date().toISOString(),
        });
        return json(res, 200, result);
      }

      return json(res, 404, { error: 'rota não encontrada' });
    } catch (err) {
      return json(res, 500, { error: (err as Error).message });
    }
  });
}

// Execução direta: `node dist/server.js`
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const deps = buildApp();
  const port = Number(process.env.PORT ?? 3000);
  createApp(deps).listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`DGR plataforma (MVP) ouvindo em http://localhost:${port}  —  ${DGR_CONSTITUTION.motto}`);
  });
}
