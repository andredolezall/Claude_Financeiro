# 02 — Financeiro (prioridade)

Departamento `FIN`. Detalhamento de Pilares → Processos → Microprocessos.
Cada microprocesso seguirá a ficha-padrão de `01-modelo-pilares-processos.md` quando
for documentado em detalhe; aqui está o **mapa** com candidatos a automação marcados 🤖.

---

## Pilar FIN-CAP — Contas a Pagar (P2P)

**Objetivo:** pagar fornecedores certos, no valor certo, na data certa, com respaldo.

### Processo: Ciclo de pagamento a fornecedores
| ID | Microprocesso | Freq. | Estágio | Auto |
|----|---------------|-------|---------|------|
| FIN-CAP-001 | Recebimento e captura de NF (XML/PDF) | sob demanda | Documentado | 🤖 |
| FIN-CAP-002 | Cadastro/validação de fornecedor (CNPJ, dados bancários) | sob demanda | Documentado | 🤖 |
| FIN-CAP-003 | Conferência nota × pedido/contrato | sob demanda | Documentado | 🤖 |
| FIN-CAP-004 | Classificação (centro de custo + conta contábil) | sob demanda | Documentado | 🤖 |
| FIN-CAP-005 | Agendamento de pagamento (data + meio) | diária | Documentado | 🤖 |
| FIN-CAP-006 | Aprovação de pagamento | diária | Documentado | decisão |
| FIN-CAP-007 | Geração de remessa / pagamento no banco | diária | Documentado | 🤖 |
| FIN-CAP-008 | Baixa e conciliação do pagamento | diária | Documentado | 🤖 |
| FIN-CAP-009 | Arquivo de comprovante + NF | sob demanda | Documentado | 🤖 |

**Rotinas:** "Fila do dia" (pagamentos do dia) · "Aging de contas a pagar" (semanal).

---

## Pilar FIN-CAR — Contas a Receber (O2C)

**Objetivo:** receber o que é devido, no prazo, com cobrança ativa e baixa correta.

### Processo: Ciclo de recebimento de clientes
| ID | Microprocesso | Freq. | Estágio | Auto |
|----|---------------|-------|---------|------|
| FIN-CAR-001 | Faturamento → geração de título a receber | sob demanda | Documentado | 🤖 |
| FIN-CAR-002 | Emissão/registro de boleto ou cobrança | sob demanda | Documentado | 🤖 |
| FIN-CAR-003 | Conciliação de recebimentos (extrato × títulos) | diária | Documentado | 🤖 |
| FIN-CAR-004 | Baixa de títulos recebidos | diária | Documentado | 🤖 |
| FIN-CAR-005 | Régua de cobrança (pré/pós-vencimento) | diária | Documentado | 🤖 |
| FIN-CAR-006 | Tratamento de inadimplência | semanal | Documentado | Assistido |
| FIN-CAR-007 | Aging de contas a receber | semanal | Documentado | 🤖 |

**Rotinas:** "Conciliação diária de recebíveis" · "Disparo da régua de cobrança".

---

## Pilar FIN-TES — Tesouraria (Caixa & Bancos)

**Objetivo:** saber exatamente quanto há, quanto entra e quanto sai — hoje e à frente.

### Processo: Gestão de caixa e bancos
| ID | Microprocesso | Freq. | Estágio | Auto |
|----|---------------|-------|---------|------|
| FIN-TES-001 | Importação de extratos bancários (todos os bancos) | diária | Documentado | 🤖 |
| FIN-TES-002 | Conciliação bancária (extrato × razão) | diária | Documentado | 🤖 |
| FIN-TES-003 | Posição de caixa consolidada (saldo do dia) | diária | Documentado | 🤖 |
| FIN-TES-004 | Fluxo de caixa projetado (D+30 / D+90) | semanal | Documentado | 🤖 |
| FIN-TES-005 | Aplicações/resgates e gestão de sobra/falta de caixa | semanal | Documentado | Assistido |
| FIN-TES-006 | Conciliação de cartão / adquirente | semanal | Documentado | 🤖 |

**Rotinas:** "Fechamento de caixa diário" · "Projeção de fluxo semanal".

> 🔑 Este pilar é o coração da automação: conciliação e fluxo de caixa são onde a
> dor de tempo costuma ser maior. Candidatos a primeiro comando (ver roadmap).

---

## Pilar FIN-CAD — Cadastros & Compliance financeiro

**Objetivo:** dados-mestres limpos e controles que evitam fraude/erro.

### Processo: Gestão de cadastros e controles internos
| ID | Microprocesso | Freq. | Estágio | Auto |
|----|---------------|-------|---------|------|
| FIN-CAD-001 | Cadastro mestre de fornecedores/clientes | sob demanda | Documentado | Assistido |
| FIN-CAD-002 | Plano de contas e centros de custo | trimestral | Documentado | manual |
| FIN-CAD-003 | Validação de dados bancários (anti-fraude) | sob demanda | Documentado | 🤖 |
| FIN-CAD-004 | Segregação de funções / alçadas de aprovação | trimestral | Documentado | manual |
| FIN-CAD-005 | Conciliação de contas contábeis (clientes, fornecedores, impostos) | mensal | Documentado | 🤖 |

---

## KPIs do departamento Financeiro

- **Saldo e fluxo:** posição de caixa diária; fluxo projetado D+30/D+90; capital de giro.
- **CAP:** prazo médio de pagamento (PMP); % pagamentos com respaldo; juros/multa por atraso.
- **CAR:** prazo médio de recebimento (PMR); inadimplência (%); aging.
- **Eficiência:** % conciliação automática; tempo de fechamento de caixa.

## Dependências externas (a confirmar com você)

- ERP/contábil específico (D2) — define como importamos NFs e títulos.
- Bancos PJ e se há API/Open Finance/OFX (D5) — define a automação de extratos.
- Adquirente de cartão (se houver) — define a conciliação de cartão.
