/**
 * extraction.ts — Extração de intenção e entidades por LLM (o "coração" do MVP).
 *
 * PROMPT MESTRE 3.1 / 8.1: transformar uma mensagem de WhatsApp em dado estruturado.
 * Ex.: "recebi 350 da Maria pelo pix" → {tipo: receita, valor: 350, contraparte: "Maria", metodo: pix}.
 *
 * Estratégia: pedimos ao modelo um JSON estrito; validamos com um parser tolerante.
 * Usa o modelo barato (MODELS.extraction) para controlar COGS (risco do plano).
 */

import { MODELS, type ClaudeClient } from './anthropic.js';
import type { PaymentMethod, TxKind } from '../core/types.js';

export type Intent =
  | 'lancamento' // receita/despesa
  | 'recebivel' // a receber
  | 'compromisso' // agenda/lembrete
  | 'consulta_gestao' // pergunta de consultoria → roteia para o DG consultor
  | 'outro';

export interface ExtractedEntry {
  intent: Intent;
  kind?: TxKind;
  valor?: number;
  contraparte?: string;
  metodo?: PaymentMethod;
  categoria?: string;
  descricao?: string;
  /** Data mencionada (ISO) ou null se "hoje"/ausente. */
  dataMencionada?: string | null;
  vencimento?: string | null; // para recebível/compromisso
  /** Confiança do modelo (0–1). Abaixo do limiar → pedir confirmação ao usuário. */
  confianca: number;
}

const EXTRACTION_SYSTEM = `Você é um extrator de dados financeiros para PMEs brasileiras.
Receba uma mensagem em português (linguagem coloquial de WhatsApp) e devolva APENAS um JSON
válido, sem texto fora do JSON, com o schema:
{
  "intent": "lancamento" | "recebivel" | "compromisso" | "consulta_gestao" | "outro",
  "kind": "receita" | "despesa" | null,
  "valor": number | null,
  "contraparte": string | null,
  "metodo": "pix" | "dinheiro" | "cartao" | "boleto" | "transferencia" | "outro" | null,
  "categoria": string | null,
  "descricao": string | null,
  "dataMencionada": "YYYY-MM-DD" | null,
  "vencimento": "YYYY-MM-DD" | null,
  "confianca": number
}
Regras:
- "recebi/entrou/vendi" => lancamento, kind=receita. "paguei/comprei/gastei" => lancamento, kind=despesa.
- "vai me pagar/fica devendo/a receber" => recebivel.
- "lembra/agenda/marca/cobrar dia X" => compromisso.
- Pergunta de gestão/conselho ("como melhorar", "vale a pena", "o que faço") => consulta_gestao.
- valor em reais como número (350.0). NÃO invente dados ausentes: use null.
- confianca: 0..1 conforme clareza da mensagem.`;

/** Parser tolerante: extrai o primeiro bloco JSON da resposta do modelo. */
export function parseExtraction(raw: string): ExtractedEntry {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) {
    return { intent: 'outro', confianca: 0 };
  }
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return { intent: 'outro', confianca: 0 };
  }
  const num = (v: unknown): number | undefined =>
    typeof v === 'number' && Number.isFinite(v) ? v : undefined;
  const str = (v: unknown): string | undefined =>
    typeof v === 'string' && v.trim() ? v.trim() : undefined;
  return {
    intent: (str(obj.intent) as Intent) ?? 'outro',
    kind: str(obj.kind) as TxKind | undefined,
    valor: num(obj.valor),
    contraparte: str(obj.contraparte),
    metodo: str(obj.metodo) as PaymentMethod | undefined,
    categoria: str(obj.categoria),
    descricao: str(obj.descricao),
    dataMencionada: (str(obj.dataMencionada) ?? null) as string | null,
    vencimento: (str(obj.vencimento) ?? null) as string | null,
    confianca: num(obj.confianca) ?? 0.5,
  };
}

/** Limiar abaixo do qual o pipeline pede confirmação ao usuário antes de persistir. */
export const CONFIRMATION_THRESHOLD = 0.6;

/** Extrai a entrada estruturada de uma mensagem de texto via Claude. */
export async function extractEntry(
  claude: ClaudeClient,
  message: string,
): Promise<ExtractedEntry> {
  const raw = await claude.complete({
    model: MODELS.extraction,
    system: EXTRACTION_SYSTEM,
    temperature: 0,
    maxTokens: 400,
    messages: [{ role: 'user', content: message }],
  });
  return parseExtraction(raw);
}

export function needsConfirmation(entry: ExtractedEntry): boolean {
  if (entry.intent === 'lancamento') return entry.confianca < CONFIRMATION_THRESHOLD || entry.valor == null;
  return entry.confianca < CONFIRMATION_THRESHOLD;
}
