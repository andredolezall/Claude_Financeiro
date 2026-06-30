/**
 * pipeline.ts — Orquestração do núcleo de valor (PROMPT MESTRE 8.1).
 *
 * Fluxo: mensagem do WhatsApp → extração por IA → persistência → resposta do DG.
 * É o "coração" do MVP: prova que uma mensagem real vira dado estruturado + resposta
 * útil, respeitando o gating por plano e a jornada do cliente.
 */

import { requireFeature, FeatureLockedError, PLANS } from './core/entitlements.js';
import { computeKPIs } from './core/finance.js';
import type { JourneyState } from './core/journey.js';
import type { InboundMessage, Transaction, Receivable, AgendaItem } from './core/types.js';
import { extractEntry, needsConfirmation, type ExtractedEntry } from './dg/extraction.js';
import { aplicarInfoOperacional } from './services/perfilOperacionalService.js';
import { consult } from './dg/consultant.js';
import type { ClaudeClient } from './dg/anthropic.js';
import { KnowledgeBase } from './dg/rag.js';
import { MemoryStore, genId } from './store/memoryStore.js';

export interface PipelineDeps {
  store: MemoryStore;
  kb: KnowledgeBase;
  claude: ClaudeClient;
  now?: () => Date;
}

export interface PipelineResult {
  reply: string;
  extracted?: ExtractedEntry;
  persisted?: { tipo: string; id: string };
}

const brl = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

function snapshot(store: MemoryStore, tenantId: string, now: Date): string {
  const k = computeKPIs(
    store.listTransactions(tenantId),
    store.listReceivables(tenantId),
    store.listPayables(tenantId),
    now,
  );
  return `Entrou no mês: ${brl(k.entrouMes)} | Saiu: ${brl(k.saiuMes)} | Sobrou: ${brl(k.sobrouMes)} | Saldo: ${brl(k.saldoAtual)} | Recebíveis em aberto: ${brl(k.recebiveisAbertos)} (atrasados ${brl(k.recebiveisAtrasados)}).`;
}

/**
 * Processa uma mensagem inbound já resolvida ao tenant. Áudio exige feature de
 * transcrição (gating) — aqui assumimos que `msg.text` já traz a transcrição quando type==='audio'.
 */
export async function handleInbound(deps: PipelineDeps, msg: InboundMessage): Promise<PipelineResult> {
  const now = (deps.now ?? (() => new Date()))();
  const tenant = deps.store.getTenant(msg.tenantId);
  if (!tenant) throw new Error(`Tenant inexistente: ${msg.tenantId}`);

  // Gating de áudio (transcrição) — Starter não tem.
  if (msg.type === 'audio') {
    try {
      requireFeature(tenant.plano, 'whatsapp_lancamento_audio');
    } catch (e) {
      if (e instanceof FeatureLockedError) {
        return { reply: `Por enquanto seu plano (${PLANS[tenant.plano].nome}) registra por texto. Lançamento por áudio está no Pro e Enterprise. Pode me mandar por texto? Ex.: "recebi 350 da Maria pelo pix".` };
      }
      throw e;
    }
  }

  const text = (msg.text ?? '').trim();
  if (!text) return { reply: 'Não consegui ler sua mensagem. Pode reenviar em texto?' };

  const entry = await extractEntry(deps.claude, text);
  const journey: JourneyState = deps.store.getJourney(tenant.id);

  switch (entry.intent) {
    case 'lancamento':
      return persistLancamento(deps, tenant.id, entry, now, msg);
    case 'recebivel':
      return persistRecebivel(deps, tenant.id, entry, now);
    case 'compromisso':
      return persistCompromisso(deps, tenant.id, entry, now, text);
    case 'info_operacional': {
      const { atualizou } = aplicarInfoOperacional(deps.store, tenant.id, entry, now);
      if (!atualizou.length) {
        return { reply: 'Entendi que é sobre sua operação, mas não captei o número. Pode repetir? Ex.: "meu ciclo de entrega é 20 dias".', extracted: entry };
      }
      return {
        reply: `📝 Aprendi sobre sua operação: ${atualizou.join('; ')}. Vou usar isso pra calcular prazos e viabilidade do seu jeito.`,
        extracted: entry,
      };
    }
    case 'consulta_gestao': {
      const { answer } = await consult(deps.claude, deps.kb, {
        tenant, journey, question: text, businessSnapshot: snapshot(deps.store, tenant.id, now),
      });
      return { reply: answer, extracted: entry };
    }
    default:
      return {
        reply: 'Recebi! Me diz se é um lançamento (ex.: "paguei 200 de luz"), um recebível ("Maria me paga 350 sexta") ou uma dúvida de gestão que eu te ajudo.',
        extracted: entry,
      };
  }
}

function persistLancamento(deps: PipelineDeps, tenantId: string, entry: ExtractedEntry, now: Date, msg: InboundMessage): PipelineResult {
  if (needsConfirmation(entry)) {
    return {
      reply: `Quase lá — só confirme: foi ${entry.kind === 'despesa' ? 'uma saída' : 'uma entrada'} de ${entry.valor ? brl(entry.valor) : '(valor?)'}${entry.contraparte ? ` com ${entry.contraparte}` : ''}? Responda "sim" para eu registrar.`,
      extracted: entry,
    };
  }
  const tx: Transaction = {
    id: genId('tx'), tenantId, kind: entry.kind ?? 'receita', valor: entry.valor!,
    contraparte: entry.contraparte, metodo: entry.metodo, categoria: entry.categoria,
    descricao: entry.descricao, data: entry.dataMencionada ?? now.toISOString().slice(0, 10),
    origem: 'whatsapp', conciliado: false, mensagemOrigemId: msg.audioId, criadoEm: now.toISOString(),
  };
  deps.store.addTransaction(tx);
  const k = computeKPIs(deps.store.listTransactions(tenantId), deps.store.listReceivables(tenantId), deps.store.listPayables(tenantId), now);
  return {
    reply: `✅ Registrei: ${tx.kind === 'despesa' ? 'saída' : 'entrada'} de ${brl(tx.valor)}${tx.contraparte ? ` (${tx.contraparte})` : ''}${tx.metodo ? ` via ${tx.metodo}` : ''}. Saldo do mês: ${brl(k.sobrouMes)}.`,
    extracted: entry, persisted: { tipo: 'transaction', id: tx.id },
  };
}

function persistRecebivel(deps: PipelineDeps, tenantId: string, entry: ExtractedEntry, now: Date): PipelineResult {
  if (entry.valor == null || !entry.contraparte) {
    return { reply: 'Me confirma quem vai pagar e quanto? Ex.: "Maria me paga 350 dia 30".', extracted: entry };
  }
  const r: Receivable = {
    id: genId('rec'), tenantId, contraparte: entry.contraparte, valor: entry.valor,
    vencimento: entry.vencimento ?? now.toISOString().slice(0, 10), status: 'aberto', criadoEm: now.toISOString(),
  };
  deps.store.addReceivable(r);
  return {
    reply: `📌 Anotei: ${r.contraparte} deve ${brl(r.valor)}, vence ${r.vencimento.slice(0, 10)}. Eu te lembro de cobrar antes do vencimento.`,
    extracted: entry, persisted: { tipo: 'receivable', id: r.id },
  };
}

function persistCompromisso(deps: PipelineDeps, tenantId: string, entry: ExtractedEntry, now: Date, text: string): PipelineResult {
  const a: AgendaItem = {
    id: genId('ag'), tenantId, titulo: entry.descricao ?? text.slice(0, 80),
    quando: entry.vencimento ?? entry.dataMencionada ?? now.toISOString(), tipo: 'tarefa',
    concluido: false, criadoEm: now.toISOString(),
  };
  deps.store.addAgenda(a);
  return {
    reply: `🗓️ Agendado: "${a.titulo}" para ${a.quando.slice(0, 10)}. Te aviso na hora.`,
    extracted: entry, persisted: { tipo: 'agenda', id: a.id },
  };
}
