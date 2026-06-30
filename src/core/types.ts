/**
 * types.ts — Modelo de domínio multi-tenant da plataforma DGR.
 *
 * Tudo aqui é isolado por `tenantId` (a empresa-cliente). Isolamento por tenant
 * é requisito de LGPD (Regra Inviolável nº 4 e nº 7).
 */

export type PlanKey = 'starter' | 'pro' | 'enterprise';

export type UserRole = 'dono' | 'operador' | 'consultor_dgr';

/**
 * Apetite de risco da empresa — calibra a recomendação do DG ao decidir atender ou
 * recusar uma oportunidade. Pode ser informado pelo dono ou inferido do comportamento.
 *  - conservador: pés no chão, recusa o que ameaça caixa/operação.
 *  - equilibrado: aceita risco moderado quando a conta fecha.
 *  - arrojado: abraça o risco para crescer/capturar cliente estratégico.
 */
export type PerfilRisco = 'conservador' | 'equilibrado' | 'arrojado';

/** Faixa de porte da PME — calibra o discurso do DG (ver dgr_constitution.ICP). */
export type RevenueTier = 'micro' | 'pequena' | 'media';

export interface Tenant {
  id: string;
  nome: string;
  cnpj?: string; // sensível — nunca cruza fronteira entre tenants (Regra nº 7)
  setor: string;
  faixaFaturamento: RevenueTier;
  plano: PlanKey;
  /** Consentimento explícito para contribuir com a camada de aprendizado agregado. Default: false (opt-in). */
  consenteAprendizadoAgregado: boolean;
  whatsappOptIn: boolean;
  /**
   * Custo variável médio como fração do faturamento (0..1) — premissa para projetar
   * lucro/prejuízo de uma oportunidade. É ESTIMATIVA até o dono calibrar (Regra nº 1).
   */
  custoVariavelPct?: number;
  /** Capacidade mensal de entrega informada pelo dono (R$). Se ausente, é estimada. */
  capacidadeMensalInformadaR$?: number;
  /** Apetite de risco informado pelo dono. Se ausente, o DG infere do comportamento. */
  perfilRisco?: PerfilRisco;
  /**
   * Duração de um ciclo de produção/entrega (dias), APRENDIDA das conversas com o dono.
   * Fiel à operação de cada cliente. Se ausente, o DG usa um default e marca como suposição.
   */
  cicloEntregaDias?: number;
  /** Perfil operacional que o DG calibra ao longo do tempo a partir do que o dono conta. */
  perfilOperacional?: PerfilOperacional;
  criadoEm: string; // ISO date
}

/**
 * Perfil operacional aprendido pelo DG conversando com o cliente — torna o
 * aconselhamento (sobretudo o cálculo de prazo) fiel à operação individual.
 */
export interface PerfilOperacional {
  atualizadoEm: string;
  /** Fatos operacionais registrados (ex.: "ciclo de entrega ~20 dias", "capacidade R$ 7.000/mês"). */
  notas: { em: string; fato: string; origem: 'conversa' | 'informado' }[];
}

export interface User {
  id: string;
  tenantId: string;
  nome: string;
  papel: UserRole;
  whatsapp?: string;
}

export type TxKind = 'receita' | 'despesa';
export type PaymentMethod = 'pix' | 'dinheiro' | 'cartao' | 'boleto' | 'transferencia' | 'outro';

/** Lançamento financeiro estruturado (saída da extração por IA). */
export interface Transaction {
  id: string;
  tenantId: string;
  kind: TxKind;
  valor: number; // em reais
  contraparte?: string;
  metodo?: PaymentMethod;
  categoria?: string;
  descricao?: string;
  data: string; // ISO date (competência/ocorrência)
  origem: 'whatsapp' | 'portal' | 'import_ofx' | 'open_finance';
  conciliado: boolean;
  mensagemOrigemId?: string;
  criadoEm: string;
}

export type ReceivableStatus = 'aberto' | 'recebido' | 'atrasado' | 'cancelado';

/** Recebível — alvo da conciliação automática e da régua de cobrança. */
export interface Receivable {
  id: string;
  tenantId: string;
  contraparte: string;
  valor: number;
  vencimento: string; // ISO date
  status: ReceivableStatus;
  notaFiscal?: string;
  recebidoEm?: string;
  criadoEm: string;
}

export type PayableStatus = 'aberto' | 'pago' | 'atrasado';

export interface Payable {
  id: string;
  tenantId: string;
  fornecedor: string;
  valor: number;
  vencimento: string;
  status: PayableStatus;
  pagoEm?: string;
  criadoEm: string;
}

/** Compromisso de agenda / lembrete (extraído de mensagem ou criado por regra). */
export interface AgendaItem {
  id: string;
  tenantId: string;
  titulo: string;
  quando: string; // ISO datetime
  tipo: 'follow_up' | 'cobranca' | 'pagamento' | 'reuniao' | 'tarefa';
  relacionadoA?: { tipo: 'lead' | 'receivable' | 'payable'; id: string };
  concluido: boolean;
  criadoEm: string;
}

export type LeadStage = 'novo' | 'qualificado' | 'proposta' | 'negociacao' | 'ganho' | 'perdido';

export interface Lead {
  id: string;
  tenantId: string;
  nome: string;
  contato?: string;
  estagio: LeadStage;
  valorPotencial: number;
  ticketMedio?: number;
  /** Prazo de entrega exigido pelo cliente (em dias). Torna inviável a opção que não cabe. */
  prazoEntregaDias?: number;
  historico: { data: string; nota: string }[];
  criadoEm: string;
}

/** Mensagem do WhatsApp (texto ou áudio transcrito). */
export interface InboundMessage {
  tenantId: string;
  fromWhatsapp: string;
  type: 'text' | 'audio';
  text?: string; // texto, ou transcrição do áudio
  audioId?: string;
  timestamp: string;
  raw?: unknown;
}
