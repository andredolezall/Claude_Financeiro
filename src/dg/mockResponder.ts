/**
 * mockResponder.ts — Responder determinístico para demo/testes SEM ANTHROPIC_API_KEY.
 *
 * Distingue chamadas de EXTRAÇÃO (system contém "extrator de dados financeiros") das
 * de CONSULTORIA (DG consultor) e devolve uma resposta plausível. NÃO substitui o
 * modelo real — serve para o ambiente de demonstração rodar sem custo/credencial.
 */

import type { ClaudeCallOptions } from './anthropic.js';

const N = (s: string, re: RegExp): number | null => {
  const m = s.match(re);
  return m ? Number(m[1].replace(/\./g, '').replace(',', '.')) : null;
};

/** Regras léxicas simples que imitam a extração por LLM (apenas para a demo). */
function mockExtract(text: string): string {
  const t = text.toLowerCase();
  const valor = N(text, /(?:r\$\s*)?(\d[\d.]*(?:,\d{2})?)/i);
  const metodo = /pix/.test(t) ? 'pix' : /boleto/.test(t) ? 'boleto' : /cart[aã]o/.test(t) ? 'cartao' : /dinheiro/.test(t) ? 'dinheiro' : null;
  // Contraparte: nome após preposição, ou sujeito antes de "vai me pagar / me paga / deve".
  const payer = text.match(/\b([A-ZÀ-Ý][\wÀ-ÿ]+(?:\s+[A-ZÀ-Ý][\wÀ-ÿ]+)?)\s+(?:vai me pagar|me paga|fica devendo|deve)/);
  const contraMatch = text.match(/\b(?:d[aeo]s?|com|para)\s+([A-ZÀ-Ý][a-zà-ÿ]+)/);
  const contraparte = payer ? payer[1] : contraMatch ? contraMatch[1] : null;
  const vencMatch = text.match(/dia\s+(\d{1,2})/);
  const vencimento = vencMatch ? `2026-07-${vencMatch[1].padStart(2, '0')}` : null;

  let intent = 'outro';
  let kind: string | null = null;
  if (/(recebi|entrou|vendi|me pagou)/.test(t)) { intent = 'lancamento'; kind = 'receita'; }
  else if (/(paguei|comprei|gastei|saiu)/.test(t)) { intent = 'lancamento'; kind = 'despesa'; }
  else if (/(vai me pagar|fica devendo|a receber|me paga|deve)/.test(t)) { intent = 'recebivel'; }
  else if (/(lembra|agenda|marca|cobrar dia|reuni[aã]o)/.test(t)) { intent = 'compromisso'; }
  else if (/(como|vale a pena|o que fa[çc]o|melhorar|devo|ajuda|por que|caixa|margem|lucro|pre[çc]o)/.test(t)) { intent = 'consulta_gestao'; }

  const conf = intent === 'outro' ? 0.3 : valor != null || intent !== 'lancamento' ? 0.85 : 0.5;
  return JSON.stringify({
    intent, kind, valor, contraparte, metodo, categoria: null, descricao: null,
    dataMencionada: null, vencimento, confianca: conf,
  });
}

/** Resposta de consultoria simulada — sempre no tom didático + justificativa (5.2). */
function mockConsult(opts: ClaudeCallOptions): string {
  const limited = (opts.system ?? '').includes('MODO LIMITADO');
  const base =
    'Boa pergunta. Pelo que vejo do seu negócio, o ponto que mais aproxima do resultado agora é ' +
    'organizar os recebíveis: dinheiro que já é seu, mas ainda não entrou. ' +
    'Recomendo ativar uma régua de cobrança (lembrete antes do vencimento, no dia e depois) — ' +
    'isso funciona em negócios como o seu porque encurta o tempo até o dinheiro cair no caixa e ' +
    'reduz a inadimplência (fonte: SEBRAE — Contas a Receber).';
  if (limited) {
    return base + ' Para um diagnóstico personalizado com plano de ação, a consultoria completa do DG está nos planos Pro e Enterprise.';
  }
  return base + ' Quer que eu já programe os lembretes de cobrança dos recebíveis em aberto e a gente meça a diferença no caixa em 30 dias?';
}

export function mockExtractionResponder(opts: ClaudeCallOptions): string {
  const system = opts.system ?? '';
  if (system.includes('extrator de dados financeiros')) {
    const userMsg = [...opts.messages].reverse().find((m) => m.role === 'user');
    return mockExtract(userMsg?.content ?? '');
  }
  return mockConsult(opts);
}
