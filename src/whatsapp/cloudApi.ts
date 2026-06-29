/**
 * cloudApi.ts — Integração com a WhatsApp Cloud API OFICIAL da Meta (Regra nº 3).
 *
 * Sem bibliotecas não-oficiais que automatizam o WhatsApp pessoal (risco de banimento
 * é risco listado no plano e mitigado por design). Zero dependências: usa fetch global.
 *
 * Conceitos respeitados:
 *  - Verificação do webhook (hub.challenge) e validação de assinatura (X-Hub-Signature-256).
 *  - Janela de 24h: mensagens livres só dentro da janela; fora dela, template HSM aprovado.
 *  - Opt-in obrigatório antes de enviar utility/marketing.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { InboundMessage } from '../core/types.js';

export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string;
  appSecret: string;
  apiVersion?: string; // ex.: 'v21.0'
}

export function loadWhatsAppConfig(env = process.env): WhatsAppConfig | null {
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = env.WHATSAPP_ACCESS_TOKEN;
  const verifyToken = env.WHATSAPP_VERIFY_TOKEN;
  const appSecret = env.WHATSAPP_APP_SECRET;
  if (!phoneNumberId || !accessToken || !verifyToken || !appSecret) return null;
  return { phoneNumberId, accessToken, verifyToken, appSecret, apiVersion: env.WHATSAPP_API_VERSION ?? 'v21.0' };
}

/** Verificação do handshake do webhook (GET). Retorna o challenge se o token bate. */
export function verifyWebhook(
  cfg: WhatsAppConfig,
  query: { mode?: string; token?: string; challenge?: string },
): string | null {
  if (query.mode === 'subscribe' && query.token === cfg.verifyToken) {
    return query.challenge ?? '';
  }
  return null;
}

/** Valida a assinatura HMAC-SHA256 do corpo (X-Hub-Signature-256: sha256=...). */
export function validateSignature(cfg: WhatsAppConfig, rawBody: string, signatureHeader?: string): boolean {
  if (!signatureHeader) return false;
  const expected = 'sha256=' + createHmac('sha256', cfg.appSecret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Extrai mensagens de texto/áudio do payload do webhook da Meta (resolução de tenant à parte). */
export function parseInbound(payload: unknown): { fromWhatsapp: string; type: 'text' | 'audio'; text?: string; audioId?: string; timestamp: string }[] {
  const out: { fromWhatsapp: string; type: 'text' | 'audio'; text?: string; audioId?: string; timestamp: string }[] = [];
  const entries = (payload as any)?.entry ?? [];
  for (const entry of entries) {
    for (const change of entry?.changes ?? []) {
      for (const msg of change?.value?.messages ?? []) {
        const ts = new Date(Number(msg.timestamp) * 1000 || Date.now()).toISOString();
        if (msg.type === 'text') {
          out.push({ fromWhatsapp: msg.from, type: 'text', text: msg.text?.body ?? '', timestamp: ts });
        } else if (msg.type === 'audio') {
          out.push({ fromWhatsapp: msg.from, type: 'audio', audioId: msg.audio?.id, timestamp: ts });
        }
      }
    }
  }
  return out;
}

export interface WhatsAppSender {
  sendText(to: string, body: string): Promise<void>;
  sendTemplate(to: string, templateName: string, lang: string, params: string[]): Promise<void>;
}

/** Sender real contra a Graph API. Texto livre só dentro da janela de 24h. */
export function createSender(cfg: WhatsAppConfig): WhatsAppSender {
  const base = `https://graph.facebook.com/${cfg.apiVersion}/${cfg.phoneNumberId}/messages`;
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${cfg.accessToken}` };
  async function post(body: unknown): Promise<void> {
    const res = await fetch(base, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`WhatsApp API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return {
    sendText: (to, body) =>
      post({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }),
    sendTemplate: (to, templateName, lang, params) =>
      post({
        messaging_product: 'whatsapp', to, type: 'template',
        template: {
          name: templateName, language: { code: lang },
          components: [{ type: 'body', parameters: params.map((p) => ({ type: 'text', text: p })) }],
        },
      }),
  };
}

/** Sender mock para testes/demonstração — registra o que "enviaria". */
export function createMockSender(): WhatsAppSender & { sent: { to: string; body: string }[] } {
  const sent: { to: string; body: string }[] = [];
  return {
    sent,
    async sendText(to, body) { sent.push({ to, body }); },
    async sendTemplate(to, name, _lang, params) { sent.push({ to, body: `[template:${name}] ${params.join(' | ')}` }); },
  };
}

export type { InboundMessage };
