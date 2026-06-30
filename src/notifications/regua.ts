/**
 * regua.ts — Régua de cobrança automática (dunning) via WhatsApp.
 *
 * PROMPT MESTRE 7.1/7.3: o nível "priority" de conciliacao_recebiveis (Enterprise)
 * inclui régua de cobrança. A régua dispara lembretes escalonados por recebível,
 * ancorados no vencimento, respeitando gating, opt-in e templates HSM (janela 24h).
 *
 * Funções puras: decidem QUE mensagem cai HOJE para cada recebível. O envio fica em
 * whatsapp/cloudApi.ts. Base de evidência: régua ativa reduz inadimplência e encurta
 * o ciclo de recebimento (SEBRAE — Contas a Receber; ver docs/pesquisa/03).
 */

import { meetsLevel } from '../core/entitlements.js';
import type { PlanKey, Receivable, Tenant } from '../core/types.js';

export type ReguaTom = 'lembrete' | 'cobranca' | 'firme';

export interface ReguaStep {
  /** Dias relativos ao vencimento: negativo = antes, 0 = no dia, positivo = depois. */
  offsetDias: number;
  tom: ReguaTom;
  /** Template HSM correspondente (precisa estar aprovado na Meta — ver docs/05). */
  template: string;
}

/** Régua padrão escalonada (antes → no dia → depois). Configurável por tenant. */
export const REGUA_PADRAO: ReguaStep[] = [
  { offsetDias: -3, tom: 'lembrete', template: 'cobranca_lembrete_previo' },
  { offsetDias: 0, tom: 'cobranca', template: 'cobranca_no_vencimento' },
  { offsetDias: 3, tom: 'firme', template: 'cobranca_em_atraso' },
  { offsetDias: 7, tom: 'firme', template: 'cobranca_em_atraso_2' },
];

/** Régua reduzida para o plano Pro (full): só lembrete antes + aviso no vencimento. */
export const REGUA_BASICA: ReguaStep[] = [
  { offsetDias: -3, tom: 'lembrete', template: 'cobranca_lembrete_previo' },
  { offsetDias: 0, tom: 'cobranca', template: 'cobranca_no_vencimento' },
];

const brl = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export interface DunningMessage {
  tenantId: string;
  receivableId: string;
  contraparte: string;
  tom: ReguaTom;
  template: string;
  /** Texto para a janela de sessão (24h); fora dela usa-se o template HSM + params. */
  mensagem: string;
  /** Parâmetros do template HSM, na ordem. */
  params: string[];
  valor: number;
}

function mesma_data(aIso: string, bIso: string): boolean {
  return aIso.slice(0, 10) === bIso.slice(0, 10);
}

function textoPorTom(tom: ReguaTom, contraparte: string, valor: number, venc: string): string {
  switch (tom) {
    case 'lembrete':
      return `Oi! Passando pra lembrar: o pagamento de ${brl(valor)} de ${contraparte} vence em ${venc}. Quer que eu já envie a cobrança?`;
    case 'cobranca':
      return `Hoje vence o pagamento de ${brl(valor)} de ${contraparte}. Posso disparar a mensagem de cobrança agora.`;
    case 'firme':
      return `Atenção: ${contraparte} está em atraso com ${brl(valor)} (vencimento ${venc}). Recomendo cobrança firme e, se necessário, renegociar prazo para não travar seu caixa.`;
  }
}

/** Resolve a régua aplicável ao plano (gating). null = plano sem régua automática. */
export function reguaDoPlano(plan: PlanKey): ReguaStep[] | null {
  if (meetsLevel(plan, 'conciliacao_recebiveis', 'priority')) return REGUA_PADRAO; // Enterprise
  if (meetsLevel(plan, 'conciliacao_recebiveis', 'full')) return REGUA_BASICA; // Pro
  return null; // Starter: manual-assistida (sem disparo automático)
}

/**
 * Mensagens da régua que caem HOJE para um recebível, dada a régua aplicável.
 * Um recebível já recebido/cancelado não gera cobrança.
 */
export function dunningParaRecebivel(
  tenantId: string,
  r: Receivable,
  regua: ReguaStep[],
  now: Date,
): DunningMessage[] {
  if (r.status === 'recebido' || r.status === 'cancelado') return [];
  const venc = new Date(r.vencimento);
  const out: DunningMessage[] = [];
  for (const step of regua) {
    const alvo = new Date(venc.getTime() + step.offsetDias * 86_400_000);
    if (mesma_data(alvo.toISOString(), now.toISOString())) {
      const vencFmt = r.vencimento.slice(0, 10);
      out.push({
        tenantId,
        receivableId: r.id,
        contraparte: r.contraparte,
        tom: step.tom,
        template: step.template,
        mensagem: textoPorTom(step.tom, r.contraparte, r.valor, vencFmt),
        params: [r.contraparte, brl(r.valor), vencFmt],
        valor: r.valor,
      });
    }
  }
  return out;
}

/**
 * Todas as mensagens de cobrança devidas hoje para um tenant, respeitando opt-in e
 * o gating do plano. Ordena por valor (Regra nº 8: maior impacto no caixa primeiro).
 */
export function cobrancasDoDia(
  tenant: Tenant,
  receivables: Receivable[],
  now: Date,
): DunningMessage[] {
  if (!tenant.whatsappOptIn) return [];
  const regua = reguaDoPlano(tenant.plano);
  if (!regua) return [];
  return receivables
    .flatMap((r) => dunningParaRecebivel(tenant.id, r, regua, now))
    .sort((a, b) => b.valor - a.valor);
}
