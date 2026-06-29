/**
 * engine.ts — Motor de notificações financeiras via WhatsApp.
 *
 * PROMPT MESTRE 7.3: alertas proativos que ajudam o fluxo de caixa, entregues por
 * WhatsApp (canal onde o empresário já está). Respeita gating por plano, janela de
 * 24h / templates HSM (ver whatsapp/cloudApi.ts) e opt-in/opt-out por tenant.
 *
 * Este módulo apenas DECIDE quais alertas gerar (regras puras, testáveis). O ENVIO
 * fica em whatsapp/cloudApi.ts. Separar decisão de entrega facilita os testes.
 */

import { meetsLevel } from '../core/entitlements.js';
import { computeKPIs, projectCash } from '../core/finance.js';
import type { Payable, Receivable, Tenant, Transaction } from '../core/types.js';

export type AlertType =
  | 'conta_a_pagar_vence'
  | 'recebivel_a_cobrar'
  | 'recebivel_atrasado'
  | 'caixa_baixo'
  | 'risco_caixa_negativo';

export interface Alert {
  tenantId: string;
  type: AlertType;
  /** 'utility' usa template HSM (fora da janela 24h); 'session' só na janela aberta. */
  canal: 'utility' | 'session';
  mensagem: string;
  /** Categoria que justifica a prioridade (Regra nº 8: impacto no resultado). */
  impactoR$?: number;
}

const brl = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export interface AlertInputs {
  tenant: Tenant;
  txns: Transaction[];
  receivables: Receivable[];
  payables: Payable[];
  now: Date;
  saldoInicial?: number;
  /** Limiar de "caixa baixo" configurável por tenant. */
  limiteCaixaBaixo?: number;
}

/**
 * Gera os alertas devidos para um tenant, respeitando opt-in e plano.
 * - Starter: notificações básicas (contas a pagar/receber simples).
 * - Pro: completas.
 * - Enterprise: + proativas (risco de caixa negativo projetado).
 */
export function buildAlerts(input: AlertInputs): Alert[] {
  const { tenant, txns, receivables, payables, now } = input;
  if (!tenant.whatsappOptIn) return []; // opt-out respeitado

  const alerts: Alert[] = [];
  const kpis = computeKPIs(txns, receivables, payables, now, input.saldoInicial ?? 0);
  const in3 = new Date(now.getTime() + 3 * 86_400_000);

  // Contas a pagar a vencer (todos os planos, nível básico).
  for (const p of payables) {
    if (p.status !== 'aberto') continue;
    const venc = new Date(p.vencimento);
    if (venc >= now && venc <= in3) {
      alerts.push({
        tenantId: tenant.id,
        type: 'conta_a_pagar_vence',
        canal: 'utility',
        mensagem: `Lembrete: conta de ${p.fornecedor} (${brl(p.valor)}) vence em ${p.vencimento.slice(0, 10)}. Impacto no seu caixa hoje projetado: ${brl(kpis.saldoAtual)}.`,
        impactoR$: p.valor,
      });
    }
  }

  // Recebíveis a cobrar / atrasados.
  for (const r of receivables) {
    if (r.status === 'aberto') {
      const venc = new Date(r.vencimento);
      if (venc >= now && venc <= in3) {
        alerts.push({
          tenantId: tenant.id, type: 'recebivel_a_cobrar', canal: 'utility',
          mensagem: `${r.contraparte} tem ${brl(r.valor)} a vencer em ${r.vencimento.slice(0, 10)}. Quer que eu prepare a cobrança?`,
          impactoR$: r.valor,
        });
      }
    } else if (r.status === 'atrasado') {
      alerts.push({
        tenantId: tenant.id, type: 'recebivel_atrasado', canal: 'utility',
        mensagem: `Atenção: ${r.contraparte} está em atraso com ${brl(r.valor)} (venceu ${r.vencimento.slice(0, 10)}). Régua de cobrança recomendada.`,
        impactoR$: r.valor,
      });
    }
  }

  // Alerta de caixa baixo (Pro+).
  if (meetsLevel(tenant.plano, 'notificacoes_caixa', 'full')) {
    const limite = input.limiteCaixaBaixo ?? 0;
    if (kpis.saldoAtual <= limite) {
      alerts.push({
        tenantId: tenant.id, type: 'caixa_baixo', canal: 'utility',
        mensagem: `Alerta de caixa: saldo atual ${brl(kpis.saldoAtual)} está no/abaixo do limite de segurança. Vamos priorizar recebíveis em aberto (${brl(kpis.recebiveisAbertos)})?`,
      });
    }
  }

  // Alerta PROATIVO de risco de caixa negativo (Enterprise — nível priority).
  if (meetsLevel(tenant.plano, 'notificacoes_caixa', 'priority')) {
    const { primeiroDiaNegativo } = projectCash(kpis.saldoAtual, receivables, payables, now, 30);
    if (primeiroDiaNegativo) {
      alerts.push({
        tenantId: tenant.id, type: 'risco_caixa_negativo', canal: 'utility',
        mensagem: `Risco de caixa negativo projetado para ${primeiroDiaNegativo}. Há descasamento entre entradas e saídas. Recomendo antecipar recebíveis ou renegociar uma conta — quer que eu monte o plano?`,
      });
    }
  }

  // Ordena por impacto no resultado (Regra nº 8).
  return alerts.sort((a, b) => (b.impactoR$ ?? 0) - (a.impactoR$ ?? 0));
}
