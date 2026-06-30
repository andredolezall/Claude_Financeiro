/**
 * viabilizacao.ts — O DG viabiliza a oportunidade e devolve a decisão ao empresário.
 *
 * Quando o negócio HOJE não consegue atender, o DG não para em "não dá": explica o
 * PORQUÊ (restrições), oferece OPÇÕES, monta PLANOS viáveis (uma ou duas opções
 * combinadas), e RECOMENDA conforme o PRAZO do cliente e o PERFIL DE RISCO da empresa.
 *
 * Dois princípios que o Andre cravou:
 *  1. PRAZO manda: uma opção que estoura o prazo do cliente é INVIÁVEL — consultor
 *     resolve problema, não cria. O faseamento que demora mais que o prazo é descartado.
 *  2. RISCO é por empresa: quem "abraça doidera pra crescer" (arrojado) recebe outra
 *     recomendação de quem "mantém os pés no chão" (conservador). A decisão é sempre do dono.
 *
 * Lógica pura e determinística (Regra nº 1): todo número é `estimado` com premissas.
 */

import type { Lead, PerfilRisco } from '../core/types.js';

export type RestricaoTipo = 'capacidade_entrega' | 'capital_de_giro';
export type OpcaoChave = 'A' | 'B' | 'C';

export interface Restricao {
  tipo: RestricaoTipo;
  descricao: string;
  gapR$: number;
}

export interface OpcaoViabilizacao {
  chave: OpcaoChave;
  titulo: string;
  comoFunciona: string;
  resolve: RestricaoTipo[];
  custoAdicionalR$: number;
  tempoEntregaDias: number;
  /** Cabe no prazo do cliente? (true se o prazo não foi informado). */
  cabeNoPrazo: boolean;
  risco: string;
  riscoScore: number; // 0..1
}

export interface ProjecaoFinanceira {
  faturamentoR$: number;
  custoR$: number;
  resultadoR$: number; // positivo = lucro, negativo = prejuízo
  margemPct: number;
  base: 'estimado';
  premissas: string[];
}

export interface PlanoViabilizacao {
  rotulo: string; // ex.: "A + C"
  opcoes: OpcaoChave[];
  tempoEntregaDias: number;
  cabeNoPrazo: boolean;
  cobreRestricoes: boolean;
  riscoScore: number;
  projecao: ProjecaoFinanceira;
}

export interface ValorEstrategico {
  relevante: boolean;
  score: number; // 0..1
  motivo: string;
}

export type DecisaoRecomendada = 'atender' | 'recusar' | 'renegociar_prazo';

export interface Recomendacao {
  decisao: DecisaoRecomendada;
  opcoes: OpcaoChave[]; // vazio se recusar
  rotulo: string | null;
  porque: string[];
  projecao: ProjecaoFinanceira | null;
}

export interface BriefViabilizacao {
  leadId: string;
  leadNome: string;
  prazoEntregaDias: number | null;
  perfilRisco: PerfilRisco;
  podeAtenderHoje: boolean;
  restricoes: Restricao[];
  opcoes: OpcaoViabilizacao[];
  projecaoPorOpcao: Record<string, ProjecaoFinanceira>;
  planos: PlanoViabilizacao[];
  recomendacao: Recomendacao | null;
  valorEstrategico: ValorEstrategico;
  resumoParaWhatsApp: string;
  decisaoNaMaoDoEmpresario: true;
}

export interface ViabilizacaoInput {
  lead: Lead;
  capacidadeMensalR$: number;
  saldoAtualR$: number;
  custoVariavelPct: number;
  perfilRisco: PerfilRisco;
  setorTicketMedioR$?: number;
  /** Prazo do cliente (dias). Se ausente, usa lead.prazoEntregaDias; senão, não filtra por prazo. */
  prazoEntregaDias?: number;
  /** Duração de um ciclo de produção/entrega (dias). Default 30. */
  cicloEntregaDias?: number;
}

const round2 = (v: number) => Math.round(v * 100) / 100;
const brl = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
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

/** Risco de uma opção, elevado quando o prazo fica apertado (pouca folga). */
function riscoOpcao(base: number, tempoDias: number, prazo: number | null): number {
  let r = base;
  if (prazo != null && prazo > 0) {
    const folga = (prazo - tempoDias) / prazo;
    if (folga < 0.2) r += 0.3; // entrega no limite do prazo = mais risco de furar
  }
  return Math.min(1, round2(r));
}

function montarOpcoes(input: ViabilizacaoInput, restricoes: Restricao[], prazo: number | null): OpcaoViabilizacao[] {
  const ciclo = input.cicloEntregaDias ?? 30;
  const fat = input.lead.valorPotencial;
  const gapCapacidade = restricoes.find((r) => r.tipo === 'capacidade_entrega')?.gapR$ ?? 0;
  const ciclosNecessarios = input.capacidadeMensalR$ > 0 ? Math.max(1, Math.ceil(fat / input.capacidadeMensalR$)) : Infinity;

  const tempoA = ciclo + 5; // terceirizar: ~1 ciclo + ramp do parceiro
  const tempoB = ciclosNecessarios * ciclo; // faseado ao longo de N ciclos (pode estourar prazo!)
  const tempoC = ciclo; // adiantamento não muda o tempo de entrega

  const cabe = (t: number) => prazo == null || t <= prazo;

  return [
    {
      chave: 'A',
      titulo: 'Terceirizar/contratar capacidade extra temporária',
      comoFunciona: 'Aumentar a entrega com parceiro/mão de obra pontual para cumprir o prazo, sem inflar custo fixo.',
      resolve: ['capacidade_entrega'],
      custoAdicionalR$: round2(gapCapacidade * FATOR_TERCEIRIZACAO),
      tempoEntregaDias: tempoA,
      cabeNoPrazo: cabe(tempoA),
      risco: 'Margem menor e qualidade do parceiro a controlar.',
      riscoScore: riscoOpcao(0.6, tempoA, prazo),
    },
    {
      chave: 'B',
      titulo: 'Negociar prazo/faseamento com o cliente',
      comoFunciona: 'Entregar em etapas dentro da capacidade atual — mais lento, pode não caber no prazo do cliente.',
      resolve: ['capacidade_entrega'],
      custoAdicionalR$: 0,
      tempoEntregaDias: tempoB,
      cabeNoPrazo: cabe(tempoB),
      risco: 'Pode estourar o prazo do cliente; depende do aceite dele.',
      riscoScore: riscoOpcao(0.3, tempoB, prazo),
    },
    {
      chave: 'C',
      titulo: 'Pedir sinal/adiantamento para financiar a operação',
      comoFunciona: 'Receber parte antecipada para bancar o custo sem comprometer o caixa.',
      resolve: ['capital_de_giro'],
      custoAdicionalR$: 0,
      tempoEntregaDias: tempoC,
      cabeNoPrazo: cabe(tempoC),
      risco: 'Cliente pode resistir ao adiantamento.',
      riscoScore: riscoOpcao(0.3, tempoC, prazo),
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

/** Combinações candidatas: opções isoladas e os pares capacidade+capital. */
const COMBINACOES: OpcaoChave[][] = [['A'], ['B'], ['C'], ['A', 'C'], ['B', 'C']];

function montarPlanos(
  opcoes: OpcaoViabilizacao[],
  restricoes: Restricao[],
  faturamento: number,
  custoBase: number,
  premissas: string[],
): PlanoViabilizacao[] {
  const binding = new Set(restricoes.map((r) => r.tipo));
  const byKey = new Map(opcoes.map((o) => [o.chave, o]));
  const planos: PlanoViabilizacao[] = [];

  for (const combo of COMBINACOES) {
    const os = combo.map((k) => byKey.get(k)!).filter(Boolean);
    if (os.length !== combo.length) continue;
    const cobertura = new Set(os.flatMap((o) => o.resolve));
    const cobreRestricoes = [...binding].every((t) => cobertura.has(t));
    if (!cobreRestricoes) continue;
    const tempo = Math.max(...os.map((o) => o.tempoEntregaDias));
    const custoAdicional = round2(os.reduce((s, o) => s + o.custoAdicionalR$, 0));
    planos.push({
      rotulo: combo.join(' + '),
      opcoes: combo,
      tempoEntregaDias: tempo,
      cabeNoPrazo: os.every((o) => o.cabeNoPrazo),
      cobreRestricoes,
      riscoScore: Math.max(...os.map((o) => o.riscoScore)),
      projecao: projetar(faturamento, custoBase, custoAdicional, premissas),
    });
  }
  // Remove planos redundantes (mesmas opções) mantendo o primeiro.
  return planos;
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
    motivo: relevante ? `este cliente já se mostrou relevante: ${motivos.join('; ')}` : 'o cliente ainda não acumulou sinais fortes de relevância',
  };
}

/**
 * Recomendação dinâmica: filtra planos VIÁVEIS (cabem no prazo) e decide conforme o
 * PERFIL DE RISCO. Se nada cabe no prazo, recomenda renegociar prazo ou recusar —
 * nunca empurra uma entrega que estoura o prazo (consultor resolve, não cria problema).
 */
function recomendar(
  planos: PlanoViabilizacao[],
  restricoes: Restricao[],
  perfil: PerfilRisco,
  valor: ValorEstrategico,
  prazo: number | null,
): Recomendacao | null {
  if (!restricoes.length) return null;

  const viaveis = planos.filter((p) => p.cabeNoPrazo);
  const positivos = viaveis.filter((p) => p.projecao.resultadoR$ > 0);

  // Nada cabe no prazo, mas existe plano que resolveria fora do prazo → renegociar prazo.
  if (!viaveis.length) {
    const foraDoPrazo = planos.filter((p) => p.cobreRestricoes);
    const motivo = prazo != null
      ? `nenhuma forma de atender cabe no prazo de ${prazo} dias sem criar problema`
      : 'não há caminho que resolva as restrições com segurança';
    if (foraDoPrazo.length) {
      const maisRapido = [...foraDoPrazo].sort((a, b) => a.tempoEntregaDias - b.tempoEntregaDias)[0];
      return {
        decisao: 'renegociar_prazo',
        opcoes: maisRapido.opcoes,
        rotulo: maisRapido.rotulo,
        porque: [
          motivo,
          `o caminho mais rápido (${maisRapido.rotulo}) entregaria em ~${maisRapido.tempoEntregaDias} dias`,
          'eu não recomendo empurrar uma entrega que fura o prazo — isso vira problema, não solução',
        ],
        projecao: maisRapido.projecao,
      };
    }
    return { decisao: 'recusar', opcoes: [], rotulo: null, porque: [motivo, 'melhor recusar do que assumir o que não se entrega'], projecao: null };
  }

  // Conservador: só topa risco baixo e margem saudável; senão recusa.
  if (perfil === 'conservador') {
    const segurosBons = positivos.filter((p) => p.riscoScore <= 0.4 && p.projecao.margemPct >= 20);
    if (segurosBons.length) {
      const escolhido = segurosBons.sort((a, b) => a.riscoScore - b.riscoScore || b.projecao.resultadoR$ - a.projecao.resultadoR$)[0];
      return { decisao: 'atender', opcoes: escolhido.opcoes, rotulo: escolhido.rotulo, projecao: escolhido.projecao, porque: porquesAtender(escolhido, perfil, valor) };
    }
    return {
      decisao: 'recusar', opcoes: [], rotulo: null, projecao: null,
      porque: ['pelo seu perfil de pés no chão, o risco/margem aqui não compensa', 'melhor preservar caixa e operação do que assumir um risco que pode te machucar'],
    };
  }

  // Arrojado: topa crescer; aceita margem mais fina para capturar cliente estratégico.
  if (perfil === 'arrojado') {
    const candidatos = positivos.length ? positivos : viaveis; // aceita até margem ~zero por estratégia
    const escolhido = [...candidatos].sort((a, b) => {
      // prioriza capturar rápido o cliente estratégico, depois resultado.
      if (a.tempoEntregaDias !== b.tempoEntregaDias) return a.tempoEntregaDias - b.tempoEntregaDias;
      return b.projecao.resultadoR$ - a.projecao.resultadoR$;
    })[0];
    return { decisao: 'atender', opcoes: escolhido.opcoes, rotulo: escolhido.rotulo, projecao: escolhido.projecao, porque: porquesAtender(escolhido, perfil, valor) };
  }

  // Equilibrado: atende se houver plano positivo; escolhe o de melhor resultado e menor risco.
  if (positivos.length) {
    const escolhido = positivos.sort((a, b) => b.projecao.resultadoR$ - a.projecao.resultadoR$ || a.riscoScore - b.riscoScore)[0];
    return { decisao: 'atender', opcoes: escolhido.opcoes, rotulo: escolhido.rotulo, projecao: escolhido.projecao, porque: porquesAtender(escolhido, perfil, valor) };
  }
  return { decisao: 'recusar', opcoes: [], rotulo: null, projecao: null, porque: ['nenhum caminho viável fecha no positivo', 'recusar protege seu resultado'] };
}

function porquesAtender(plano: PlanoViabilizacao, perfil: PerfilRisco, valor: ValorEstrategico): string[] {
  const p: string[] = [`cabe no prazo (entrega em ~${plano.tempoEntregaDias} dias)`];
  p.push(plano.projecao.resultadoR$ >= 0 ? `fecha no positivo (${brl(plano.projecao.resultadoR$)} estimados)` : `assume margem fina (${brl(plano.projecao.resultadoR$)}) de forma calculada`);
  if (plano.riscoScore <= 0.4) p.push('risco baixo');
  if (perfil === 'arrojado' && valor.relevante) p.push('vale a aposta para capturar um cliente estratégico e crescer');
  if (perfil === 'conservador') p.push('mantém os pés no chão: segurança antes de volume');
  return p;
}

function montarResumo(b: Omit<BriefViabilizacao, 'resumoParaWhatsApp' | 'decisaoNaMaoDoEmpresario'>): string {
  if (b.podeAtenderHoje) {
    return `Sobre ${b.leadNome}: você CONSEGUE atender com a estrutura atual${b.prazoEntregaDias ? ` dentro do prazo de ${b.prazoEntregaDias} dias` : ''}. Bora fechar — quer que eu prepare a abordagem?`;
  }
  const porques = b.restricoes.map((r) => r.descricao).join('; ');
  const linhasOpcoes = b.opcoes
    .map((o) => {
      const prazoTag = b.prazoEntregaDias == null ? '' : o.cabeNoPrazo ? ` [cabe no prazo: ~${o.tempoEntregaDias}d]` : ` [✗ INVIÁVEL: ~${o.tempoEntregaDias}d, acima do prazo de ${b.prazoEntregaDias}d]`;
      return `${o.chave}) ${o.titulo} — ${o.comoFunciona}${o.custoAdicionalR$ ? ` (custo extra ~${brl(o.custoAdicionalR$)})` : ''}${prazoTag}`;
    })
    .join('\n');

  const rec = b.recomendacao;
  let linhaRec = '';
  let linhaNumeros = '';
  if (rec) {
    if (rec.decisao === 'atender') {
      linhaRec = `Considerando seu perfil ${b.perfilRisco} e o prazo, minha recomendação é ${rec.rotulo}, porque ${rec.porque.join(', ')}.`;
      if (rec.projecao) {
        linhaNumeros = `Atender geraria ${brl(rec.projecao.faturamentoR$)} de faturamento, ${brl(rec.projecao.custoR$)} de custo e ${brl(Math.abs(rec.projecao.resultadoR$))} de ${rec.projecao.resultadoR$ >= 0 ? 'lucro' : 'PREJUÍZO'} (estimado; ${rec.projecao.premissas.join('; ')}).`;
      }
    } else if (rec.decisao === 'renegociar_prazo') {
      linhaRec = `Considerando seu perfil ${b.perfilRisco}, minha recomendação é RENEGOCIAR O PRAZO: ${rec.porque.join(', ')}. Se o cliente topar o novo prazo, aí sim vale fechar.`;
      if (rec.projecao) {
        linhaNumeros = `Nesse caso, geraria ${brl(rec.projecao.faturamentoR$)} de faturamento, ${brl(rec.projecao.custoR$)} de custo e ${brl(Math.abs(rec.projecao.resultadoR$))} de ${rec.projecao.resultadoR$ >= 0 ? 'lucro' : 'PREJUÍZO'} (estimado).`;
      }
    } else {
      linhaRec = `Considerando seu perfil ${b.perfilRisco}, minha recomendação é NÃO atender desta vez: ${rec.porque.join(', ')}.`;
    }
  }
  const linhaValor = `Sobre o cliente: ${b.valorEstrategico.motivo}.`;
  const fecho = 'A decisão é sua — me avise o que decidir para eu registrar e fortalecer nossa base, deixando sua operação ainda mais forte.';
  return [
    `Sobre ${b.leadNome}: hoje você NÃO consegue atender porque ${porques}.`,
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
  const prazo = input.prazoEntregaDias ?? input.lead.prazoEntregaDias ?? null;
  const premissas = [`custo variável estimado em ${Math.round(input.custoVariavelPct * 100)}% do faturamento — a validar`];

  const restricoes = detectarRestricoes(input, custoBase);
  const podeAtenderHoje = restricoes.length === 0;
  const opcoes = montarOpcoes(input, restricoes, prazo);

  const projecaoPorOpcao: Record<string, ProjecaoFinanceira> = {};
  for (const o of opcoes) projecaoPorOpcao[o.chave] = projetar(faturamento, custoBase, o.custoAdicionalR$, premissas);
  projecaoPorOpcao.base = projetar(faturamento, custoBase, 0, premissas);

  const planos = podeAtenderHoje ? [] : montarPlanos(opcoes, restricoes, faturamento, custoBase, premissas);
  const valorEstrategico = avaliarRelevancia(input);
  const recomendacao = recomendar(planos, restricoes, input.perfilRisco, valorEstrategico, prazo);

  const semResumo = {
    leadId: input.lead.id,
    leadNome: input.lead.nome,
    prazoEntregaDias: prazo,
    perfilRisco: input.perfilRisco,
    podeAtenderHoje,
    restricoes,
    opcoes: podeAtenderHoje ? [] : opcoes,
    projecaoPorOpcao,
    planos,
    recomendacao,
    valorEstrategico,
  };
  return { ...semResumo, resumoParaWhatsApp: montarResumo(semResumo), decisaoNaMaoDoEmpresario: true };
}
