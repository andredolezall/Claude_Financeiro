# 00 — Visão e Arquitetura

## Objetivo

Operar **Financeiro, Controladoria, Fiscal e RH** de uma empresa de ~R$ 10M/ano com **uma
pessoa**, com clareza, eficiência, eficácia e assertividade. Para isso:

1. **Modelar** a operação em Pilares → Processos → Microprocessos (o "mapa" do departamento).
2. **Documentar** esse mapa no Notion (fonte da verdade para humanos).
3. **Automatizar** as rotinas repetitivas em poucos comandos executados pelo Claude Code.

## O que é o "sistema"

Abordagem recomendada: **Claude Code-cêntrico com utilitários Python sob demanda.**

```
        ┌─────────────────────────────────────────────┐
        │                 VOCÊ (operador)              │
        │      "poucos comandos" → /conciliar, etc.    │
        └───────────────────────┬─────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │      Claude Code        │  ← motor de orquestração
                    │  (.claude/commands/*)   │
                    └───┬─────────┬───────┬───┘
                        │         │       │
          ┌─────────────▼──┐  ┌───▼────┐ ┌▼──────────────┐
          │ bases-de-      │  │ Notion │ │ Scripts Python │
          │ conhecimento/  │  │  API   │ │ (extrato, ERP, │
          │ (versionado)   │  │        │ │  planilha, NF) │
          └────────────────┘  └────┬───┘ └───────┬────────┘
                                   │             │
                            ┌──────▼──────┐  ┌───▼─────────────┐
                            │   Notion     │  │ ERP / Banco PJ / │
                            │ (documentação│  │ Planilhas        │
                            │  + dados)    │  │                  │
                            └─────────────┘  └─────────────────┘
```

### Por que essa abordagem

- **Você já usa o Claude.** O custo de entrada é mínimo: comandos em vez de um app inteiro.
- **Pouca infra para manter** — crítico para operação de 1 pessoa.
- **Evolui sem retrabalho:** começa com checklists e documentação assistida; quando uma
  rotina vira gargalo, encapsulamos num script Python chamado pelo mesmo comando.
- **Notion como fonte da verdade** para humanos; repositório como fonte da verdade para
  automação (versionado, auditável, com histórico).

### Decisões em aberto (suas)

| # | Decisão | Definição | Status |
|---|---------|-----------|--------|
| D1 | Abordagem do sistema | **Claude Code-cêntrica + utilitários Python sob demanda** | ✅ confirmado |
| D2 | ERP | **MaxiProd** (ERP industrial — PCP/produção). Empresa é indústria. | ✅ confirmado |
| D3 | Regime tributário | **Lucro Presumido** (IRPJ/CSLL trimestral; PIS/COFINS cumulativo) | ✅ confirmado |
| D4 | Tipo de NF | **NF-e (produto)** → ICMS, SPED Fiscal, EFD-Contribuições | ✅ confirmado |
| D5 | Banco PJ | Sem API; **extração de OFX** disponível → conciliação via OFX | ✅ confirmado |
| D6 | RH interno × terceirizado | a definir | ⏳ aberto |
| D7 | Mestre da ontologia (repo × Notion) | recomendação: **repo como mestre** | ⏳ a confirmar |

## Princípios de design

1. **Um microprocesso = uma ficha padronizada** (ver `01-modelo-pilares-processos.md`).
   Documentável hoje, automatizável amanhã, sem mudar o formato.
2. **Idempotência e rastro:** todo comando registra o que fez (no Notion e/ou em log),
   para auditoria e para refazer com segurança.
3. **Humano no comando das decisões; máquina nas tarefas repetitivas.** Conferência,
   conciliação e preenchimento são automatizáveis; aprovação de pagamento é decisão.
4. **Comece manual-assistido, evolua para automático.** Cada microprocesso passa por
   3 estágios: `Documentado → Assistido → Automatizado`.

## Glossário rápido

- **Pilar:** grande agrupamento de responsabilidades dentro de um departamento (ex.: Contas a Pagar).
- **Processo:** fluxo ponta a ponta com início, fim e objetivo (ex.: Ciclo de pagamento a fornecedores).
- **Microprocesso:** etapa atômica e repetível de um processo (ex.: Conferência nota × pedido).
- **Rotina:** execução agendada de um ou mais microprocessos (diária, semanal, mensal).
- **POP/SOP:** Procedimento Operacional Padrão — o "como fazer" de um microprocesso.
