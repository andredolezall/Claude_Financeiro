/**
 * viabilizacao.ts — O DG viabiliza a oportunidade e devolve a decisão ao empresário.
 *
 * Quando o negócio HOJE não consegue atender uma demanda, o DG não para em "não dá":
 * ele explica POR QUÊ (restrições), oferece OPÇÕES (A/B/C) para viabilizar, dá uma
 * RECOMENDAÇÃO com o porquê, e QUANTIFICA (faturamento, custo, lucro/prejuízo) +
 * o valor estratégico do cliente. A DECISÃO fica com o dono (PROMPT MESTRE 5.6 + 7.2).
 *
 * Lógica pura e determinística (Regra nº 1): todo número é `estimado` com premissas
 * explícitas. O DG só narra — não inventa. A captura da decisão e a retroalimentação
 * da base ficam em services/viabilizacaoService.ts.
 */

import type { Lead } from '../core/types.js';

export type RestricaoTipo = 'capacidade_entrega' | 'capital_de_giro';

export interface Restricao {
  tipo: RestricaoTipo;
  descricao: string;
  gapR$: number;
}

export interface OpcaoViabilizacao {
  chave: 'A' | 'B' | 'C';
  titulo: string;
  comoFunciona: string;
  resolve: RestricaoTipo[];
  custoAdicionalR$: number;
  risco: string;
}

export interface ProjecaoFinanceira {
  faturamentoR$: number;
  custoR$: number;
  resultadoR$: number; // positivo = lucro, negativo = prejuízo
  margemPct: number;
  base: 'estimado';
  premissas: string[];
}

export interface ValorEstrategico {
  relevante: boolean;
  score: number; // 0..1
  motivo: string;
}

export interface BriefViabilizacao {
  leadId: string;
  leadNome: string;
  podeAtenderHoje: boolean;
  restricoes: Restricao[];
  opcoes: OpcaoViabilizacao[];
  projecaoPorOpcao: Record<string, ProjecaoFinanceira>;
  recomendacao: { opcao: 'A' | 'B' | 'C'; porque: string[] } | null;
  valorEstrategico: ValorEstrategico;
  resumoParaWhatsApp: string;
  decisaoNaMaoDoEmpresario: true;
}

export interface ViabilizacaoInput {
  lead: Lead;
  /** Capacidade mensal de entrega disponível (R$). */
  capacidadeMensalR$: number;
  /** Saldo de caixa disponível para financiar o custo antes de receber (R$). */
  saldoAtualR$: number;
  /** Custo variável como fração do faturamento (premissa; 0..1). */
  custoVariavelPct: number;
  /** Ticket médio do setor (para avaliar relevância do cliente), se conhecido. */
  setorTicketMedioR$?: number;
}

const round2 = (v: number) => Math.round(v * 100) / 100;
const brl = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

/** Fator de custo extra da terceirização sobre a parcela excedente (premissa). */
const FATOR_TERCEIRIZACAO = 0.35;

function detectarRestricoes(input: ViabilizacaoInput, custoBase: number): Restricao[] {
  const restricoes: Restricao[] = [];
  const fat = input.lead.valorPotencial;
  if (fat > input.capacidadeMensalR$) {
    restricoes.push({
      tipo: 'capacidade_entrega',
      descricao: `a demanda (${brl(fat)}) supera sua capacidade de entrega no mês (${brl(input.capacidadeMensalR$)})`,
      gapR$: round2(fat - input.capacidadeMensalR$),
    });
  }
  if (custoBase > input.saldoAtualR$) {
    restricoes.push({
      tipo: 'capital_de_giro',
      descricao: `o custo para atender (${brl(custoBase)}) é maior que o caixa disponível hoje (${brl(input.saldoAtualR$)})`,
      gapR$: round2(custoBase - input.saldoAtualR$),
    });
  }
  return restricoes;
}

function montarOpcoes(restricoes: Restricao[]): OpcaoViabilizacao[] {
  const gapCapacidade = restricoes.find((r) => r.tipo === 'capacidade_entrega')?.gapR$ ?? 0;
  return [
    {
      chave: 'A',
      titulo: 'Terceirizar/contratar capacidade extra temporária',
      comoFunciona: 'Aumentar a entrega com mão de obra ou parceiro pontual para cobrir o excedente, sem inflar custo fixo.',
      resolve: ['capacidade_entrega'],
      custoAdicionalR$: round2(gapCapacidade * FATOR_TERCEIRIZACAO),
      risco: 'Margem menor; qualidade do parceiro precisa de controle.',
    },
    {
      chave: 'B',
      titulo: 'Negociar prazo/faseamento com o cliente',
      comoFunciona: 'Entregar em etapas dentro da sua capacidade atual, esticando o prazo combinado.',
      resolve: ['capacidade_entrega'],
      custoAdicionalR$: 0,
      risco: 'Cliente pode não aceitar o prazo maior.',
    },
    {
      chave: 'C',
      titulo: 'Pedir sinal/adiantamento para financiar a operação',
      comoFunciona: 'Receber parte antecipada para bancar o custo sem comprometer o caixa.',
      resolve: ['capital_de_giro'],
      custoAdicionalR$: 0,
      risco: 'Cliente pode resistir ao adiantamento.',
    },
  ];
}

function projetar(faturamento: number, custoBase: number, custoAdicional: number, premissas: string[]): ProjecaoFinanceira {
  const custo = round2(custoBase + custoAdicional);
  const resultado = round2(faturamento - custo);
  return {
    faturamentoR$: round2(faturamento),
    custoR$: custo,
    resultadoR$: resultado,
    margemPct: faturamento > 0 ? Math.round((resultado / faturamento) * 100) : 0,
    base: 'estimado',
    premissas,
  };
}

function avaliarRelevancia(input: ViabilizacaoInput): ValorEstrategico {
  const { lead } = input;
  const motivos: string[] = [];
  let score = 0;
  const interacoes = lead.historico.length;
  if (interacoes >= 2) { score += 0.4; motivos.push(`já houve ${interacoes} interações (relacionamento ativo)`); }
  if (lead.ticketMedio && input.setorTicketMedioR$ && lead.ticketMedio >= input.setorTicketMedioR$) {
    score += 0.3; motivos.push('ticket médio acima da média do setor');
  }
  if (lead.valorPotencial >= input.capacidadeMensalR$) { score += 0.3; motivos.push('é um contrato grande para o seu porte'); }
  const relevante = score >= 0.4;
  return {
    relevante,
    score: Math.min(1, round2(score)),
    motivo: relevante
      ? `este cliente já se mostrou relevante: ${motivos.join('; ')}`
      : 'o cliente ainda não acumulou sinais fortes de relevância',
  };
}

/** Escolhe a opção recomendada: resolve as restrições com o melhor resultado e menor risco. */
function recomendar(
  restricoes: Restricao[],
  opcoes: OpcaoViabilizacao[],
  projecao: Record<string, ProjecaoFinanceira>,
  valor: ValorEstrategico,
): { opcao: 'A' | 'B' | 'C'; porque: string[] } | null {
  if (!restricoes.length) return null;
  const tiposBinding = new Set(restricoes.map((r) => r.tipo));

  // Candidatas que resolvem pelo menos uma restrição vigente.
  const candidatas = opcoes.filter((o) => o.resolve.some((t) => tiposBinding.has(t)));
  if (!candidatas.length) return null;

  // Ranqueia: maior resultado projetado; em empate, menor custo adicional.
  const ranked = [...candidatas].sort((a, b) => {
    const ra = projecao[a.chave].resultadoR$;
    const rb = projecao[b.chave].resultadoR$;
    if (rb !== ra) return rb - ra;
    return a.custoAdicionalR$ - b.custoAdicionalR$;
  });
  const escolhida = ranked[0];
  const proj = projecao[escolhida.chave];
  const porque: string[] = [
    `resolve ${escolhida.resolve.join(' e ')}`,
    proj.resultadoR$ >= 0
      ? `mantém o negócio no positivo (${brl(proj.resultadoR$)} de resultado estimado)`
      : `é o de menor prejuízo entre as viáveis (${brl(proj.resultadoR$)})`,
    escolhida.custoAdicionalR$ === 0 ? 'não adiciona custo' : `tem custo extra controlado de ${brl(escolhida.custoAdicionalR$)}`,
  ];
  if (valor.relevante) porque.push('vale o esforço porque o cliente é estratégico');
  return { opcao: escolhida.chave, porque };
}

function montarResumo(brief: Omit<BriefViabilizacao, 'resumoParaWhatsApp' | 'decisaoNaMaoDoEmpresario'>): string {
  if (brief.podeAtenderHoje) {
    return `Sobre ${brief.leadNome}: você CONSEGUE atender com a estrutura atual. Bora fechar — quer que eu prepare a abordagem?`;
  }
  const porques = brief.restricoes.map((r) => r.descricao).join('; ');
  const linhasOpcoes = brief.opcoes
    .map((o) => `${o.chave}) ${o.titulo} — ${o.comoFunciona}${o.custoAdicionalR$ ? ` (custo extra ~${brl(o.custoAdicionalR$)})` : ''}`)
    .join('\n');
  const rec = brief.recomendacao;
  const projRec = rec ? brief.projecaoPorOpcao[rec.opcao] : null;
  const linhaRec = rec
    ? `Minha recomendação é a ${rec.opcao}, porque ${rec.porque.join(', ')}.`
    : 'Nenhuma opção isolada resolve tudo — vale combinar duas. Posso detalhar.';
  const linhaNumeros = projRec
    ? `Atender (via ${rec!.opcao}) geraria ${brl(projRec.faturamentoR$)} de faturamento, ${brl(projRec.custoR$)} de custo e ` +
      `${brl(Math.abs(projRec.resultadoR$))} de ${projRec.resultadoR$ >= 0 ? 'lucro' : 'PREJUÍZO'} (estimado; ${projRec.premissas.join('; ')}).`
    : '';
  const linhaValor = `Além disso, ${brief.valorEstrategico.motivo}.`;
  const fecho =
    'A decisão é sua — me avise o que decidir para eu registrar e fortalecer nossa base, ' +
    'deixando sua operação ainda mais forte.';
  return [
    `Sobre ${brief.leadNome}: hoje você NÃO consegue atender porque ${porques}.`,
    `Para viabilizar, as opções são:\n${linhasOpcoes}`,
    linhaRec,
    linhaNumeros,
    linhaValor,
    fecho,
  ].filter(Boolean).join('\n\n');
}

/** Monta o brief completo de viabilização de uma oportunidade. */
export function gerarBrief(input: ViabilizacaoInput): BriefViabilizacao {
  const faturamento = input.lead.valorPotencial;
  const custoBase = round2(faturamento * input.custoVariavelPct);
  const premissas = [`custo variável estimado em ${Math.round(input.custoVariavelPct * 100)}% do faturamento — a validar`];

  const restricoes = detectarRestricoes(input, custoBase);
  const podeAtenderHoje = restricoes.length === 0;
  const opcoes = montarOpcoes(restricoes);

  const projecaoPorOpcao: Record<string, ProjecaoFinanceira> = {};
  for (const o of opcoes) projecaoPorOpcao[o.chave] = projetar(faturamento, custoBase, o.custoAdicionalR$, premissas);
  // Projeção "como está" (sem opção) também disponível na chave 'base'.
  projecaoPorOpcao.base = projetar(faturamento, custoBase, 0, premissas);

  const valorEstrategico = avaliarRelevancia(input);
  const recomendacao = recomendar(restricoes, opcoes, projecaoPorOpcao, valorEstrategico);

  const semResumo = {
    leadId: input.lead.id,
    leadNome: input.lead.nome,
    podeAtenderHoje,
    restricoes,
    opcoes: podeAtenderHoje ? [] : opcoes,
    projecaoPorOpcao,
    recomendacao,
    valorEstrategico,
  };
  return {
    ...semResumo,
    resumoParaWhatsApp: montarResumo(semResumo),
    decisaoNaMaoDoEmpresario: true,
  };
}
