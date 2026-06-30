/**
 * seed.ts — Ambiente de demonstração com dados fictícios de uma PME (PROMPT MESTRE 8.5).
 *
 * Serve para vender e validar (meta: 5 clientes pagantes + 3 cases com ROI em 90 dias).
 * Nenhum dado real de cliente — tudo fictício.
 */

import { MemoryStore } from '../store/memoryStore.js';
import { KnowledgeBase, type KnowledgeChunk } from '../dg/rag.js';
import type { AgendaItem, Lead, Payable, Receivable, Tenant, Transaction, User } from '../core/types.js';

const DEMO_TENANT_ID = 'demo_padaria';
const ISO = (d: string) => d; // datas já em ISO

/** PME exemplo: padaria/lanchonete de bairro que vende pelo WhatsApp. */
export function seedDemoTenant(store: MemoryStore): Tenant {
  const tenant: Tenant = {
    id: DEMO_TENANT_ID,
    nome: 'Padaria Pão & Cia (DEMO)',
    cnpj: '00.000.000/0001-00',
    setor: 'alimentacao_varejo',
    faixaFaturamento: 'pequena',
    plano: 'pro',
    consenteAprendizadoAgregado: false, // opt-in: default não contribui (Regra nº 7)
    whatsappOptIn: true,
    custoVariavelPct: 0.55, // premissa de custo (insumos/produção) — a calibrar com o dono
    criadoEm: '2026-06-01T00:00:00.000Z',
  };
  store.createTenant(tenant);

  const dono: User = { id: 'u_dono', tenantId: tenant.id, nome: 'Seu Antônio', papel: 'dono', whatsapp: '5511999990000' };
  store.addUser(dono);

  const txns: Transaction[] = [
    { id: 't1', tenantId: tenant.id, kind: 'receita', valor: 1200, contraparte: 'Vendas balcão', metodo: 'dinheiro', categoria: 'vendas', data: '2026-06-03', origem: 'whatsapp', conciliado: true, criadoEm: ISO('2026-06-03') },
    { id: 't2', tenantId: tenant.id, kind: 'receita', valor: 350, contraparte: 'Maria', metodo: 'pix', categoria: 'vendas', data: '2026-06-10', origem: 'whatsapp', conciliado: false, criadoEm: ISO('2026-06-10') },
    { id: 't3', tenantId: tenant.id, kind: 'despesa', valor: 2800, contraparte: 'Moinho Trigo Bom', metodo: 'boleto', categoria: 'insumos', data: '2026-06-05', origem: 'portal', conciliado: true, criadoEm: ISO('2026-06-05') },
    { id: 't4', tenantId: tenant.id, kind: 'despesa', valor: 600, contraparte: 'Energia', metodo: 'boleto', categoria: 'utilidades', data: '2026-06-12', origem: 'portal', conciliado: true, criadoEm: ISO('2026-06-12') },
    { id: 't5', tenantId: tenant.id, kind: 'receita', valor: 4200, contraparte: 'Encomendas festas', metodo: 'pix', categoria: 'vendas', data: '2026-06-20', origem: 'whatsapp', conciliado: false, criadoEm: ISO('2026-06-20') },
  ];
  txns.forEach((t) => store.addTransaction(t));

  const receivables: Receivable[] = [
    { id: 'r1', tenantId: tenant.id, contraparte: 'Buffet da Praça', valor: 1800, vencimento: '2026-07-02', status: 'aberto', notaFiscal: 'NF-1021', criadoEm: ISO('2026-06-20') },
    { id: 'r2', tenantId: tenant.id, contraparte: 'Mercadinho do Zé', valor: 950, vencimento: '2026-06-25', status: 'atrasado', notaFiscal: 'NF-1009', criadoEm: ISO('2026-06-10') },
  ];
  receivables.forEach((r) => store.addReceivable(r));

  const payables: Payable[] = [
    { id: 'p1', tenantId: tenant.id, fornecedor: 'Moinho Trigo Bom', valor: 3000, vencimento: '2026-07-05', status: 'aberto', criadoEm: ISO('2026-06-20') },
    { id: 'p2', tenantId: tenant.id, fornecedor: 'Aluguel', valor: 2500, vencimento: '2026-07-01', status: 'aberto', criadoEm: ISO('2026-06-20') },
  ];
  payables.forEach((p) => store.addPayable(p));

  const leads: Lead[] = [
    { id: 'l1', tenantId: tenant.id, nome: 'Escola Crescer (lanches semanais)', contato: '5511988887777', estagio: 'qualificado', valorPotencial: 6000, ticketMedio: 1500, historico: [{ data: '2026-06-18', nota: 'Pediu orçamento de lanche para 120 alunos' }], criadoEm: ISO('2026-06-18') },
    { id: 'l2', tenantId: tenant.id, nome: 'Condomínio Jardins (café da manhã)', estagio: 'proposta', valorPotencial: 3200, ticketMedio: 800, historico: [{ data: '2026-06-22', nota: 'Enviada proposta; aguardando síndico' }], criadoEm: ISO('2026-06-22') },
  ];
  leads.forEach((l) => store.addLead(l));

  const agenda: AgendaItem[] = [
    { id: 'a1', tenantId: tenant.id, titulo: 'Cobrar Mercadinho do Zé (NF-1009 atrasada)', quando: '2026-06-30T09:00:00.000Z', tipo: 'cobranca', relacionadoA: { tipo: 'receivable', id: 'r2' }, concluido: false, criadoEm: ISO('2026-06-25') },
    { id: 'a2', tenantId: tenant.id, titulo: 'Follow-up proposta Condomínio Jardins', quando: '2026-07-01T14:00:00.000Z', tipo: 'follow_up', relacionadoA: { tipo: 'lead', id: 'l2' }, concluido: false, criadoEm: ISO('2026-06-25') },
  ];
  agenda.forEach((a) => store.addAgenda(a));

  return tenant;
}

/**
 * Base de conhecimento de demonstração. A coleção curada cita fontes reais levantadas
 * na Fase 0 (docs/pesquisa/03_base_conhecimento_consultor.md). A coleção de aprendizado
 * anonimizado é gerada por job (anonymization.ts), nunca colada à mão com dado bruto.
 *
 * NOTA: estes chunks são amostras de demonstração — a base real é ingerida da pesquisa 3.3.
 */
export function seedKnowledgeBase(kb: KnowledgeBase): void {
  const curated: KnowledgeChunk[] = [
    {
      id: 'kb1', collection: 'kb_curado_dgr',
      text: 'Separar a conta da pessoa física da conta da empresa é a primeira medida de controle financeiro em micro e pequenas empresas: sem isso não há como medir lucro real nem fluxo de caixa. Problema que resolve: confusão entre caixa pessoal e do negócio.',
      metadata: { fonte: 'SEBRAE — Gestão Financeira para PMEs', faixa: 'micro', evidencia: 'comprovado' },
    },
    {
      id: 'kb2', collection: 'kb_curado_dgr',
      text: 'Régua de cobrança ativa (lembrete 3 dias antes, no vencimento e 3 dias após) reduz inadimplência e encurta o ciclo de recebimento. Aplica-se a negócios que vendem fiado/por encomenda. Problema que resolve: recebível em atraso e caixa imprevisível.',
      metadata: { fonte: 'SEBRAE — Contas a Receber', faixa: 'pequena', evidencia: 'comprovado' },
    },
    {
      id: 'kb3', collection: 'kb_curado_dgr',
      text: 'Capital de giro é o dinheiro que precisa ficar disponível para o negócio operar enquanto clientes ainda não pagaram e fornecedores precisam ser pagos. Calcular o ciclo financeiro (prazo de recebimento menos prazo de pagamento) revela quanto caixa o negócio precisa reservar.',
      metadata: { fonte: 'Administração Financeira (bibliografia canônica)', faixa: 'geral', evidencia: 'comprovado' },
    },
    {
      id: 'kb4', collection: 'kb_curado_dgr',
      text: 'Em alimentação/varejo de bairro, definir markup mínimo por categoria de produto e revisar o preço quando o custo do insumo sobe protege a margem. Vender encomendas (festas/eventos) com sinal antecipado melhora o caixa. Problema que resolve: margem corroída por insumo e caixa sazonal.',
      metadata: { fonte: 'SEBRAE — Formação de Preço no varejo de alimentos', setor: 'alimentacao_varejo', faixa: 'pequena', evidencia: 'comprovado' },
    },
  ];
  kb.addMany(curated);
}

export { DEMO_TENANT_ID };
