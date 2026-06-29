/**
 * anthropic.ts — Cliente fino da Claude API (Anthropic), sem dependências externas.
 *
 * Usa o `fetch` global do Node 22+. A chave fica em ANTHROPIC_API_KEY (fora do
 * versionamento — ver .gitignore). PROMPT MESTRE 7: usar a Anthropic API (Claude)
 * para extração/intenção e para o DG consultor.
 *
 * Controle de custo de LLM (mitigação do risco de COGS — 7.2): modelo configurável
 * por tarefa, para usar um modelo menor/barato em tarefas simples (extração) e um
 * mais capaz na consultoria. Default abaixo.
 */

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeCallOptions {
  system?: string;
  messages: ClaudeMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Modelos por tarefa. Tarefa simples (extração) usa modelo barato; consultoria usa
 * modelo capaz. IDs configuráveis por env para não acoplar a versão no código.
 */
export const MODELS = {
  extraction: process.env.DGR_MODEL_EXTRACTION ?? 'claude-haiku-4-5-20251001',
  consultant: process.env.DGR_MODEL_CONSULTANT ?? 'claude-opus-4-8',
} as const;

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

export class AnthropicConfigError extends Error {}

export interface ClaudeClient {
  complete(opts: ClaudeCallOptions): Promise<string>;
}

/** Cliente real contra a Claude API. */
export function createClaudeClient(apiKey = process.env.ANTHROPIC_API_KEY): ClaudeClient {
  return {
    async complete(opts: ClaudeCallOptions): Promise<string> {
      if (!apiKey) {
        throw new AnthropicConfigError(
          'ANTHROPIC_API_KEY ausente. Configure no .env (ver .env.example). ' +
            'Para testes/demonstração sem custo, use createMockClaudeClient().',
        );
      }
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': API_VERSION,
        },
        body: JSON.stringify({
          model: opts.model ?? MODELS.consultant,
          max_tokens: opts.maxTokens ?? 1024,
          temperature: opts.temperature ?? 0.3,
          system: opts.system,
          messages: opts.messages,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Claude API ${res.status}: ${body.slice(0, 500)}`);
      }
      const data = (await res.json()) as { content?: { type: string; text?: string }[] };
      return (data.content ?? [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text ?? '')
        .join('')
        .trim();
    },
  };
}

/**
 * Cliente mock determinístico para testes e ambiente de demonstração (sem chave/custo).
 * `responder` recebe as opções e devolve a resposta — permite simular extração e DG.
 */
export function createMockClaudeClient(
  responder: (opts: ClaudeCallOptions) => string,
): ClaudeClient {
  return {
    async complete(opts: ClaudeCallOptions) {
      return responder(opts);
    },
  };
}
