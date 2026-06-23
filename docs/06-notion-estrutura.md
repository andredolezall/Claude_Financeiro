# 06 — Estrutura do Notion + Integração

O Notion é a **fonte da verdade para humanos**: documentação navegável de toda a operação.
O repositório é a fonte da verdade para a **automação**. Os dois espelham a mesma ontologia
de `01-modelo-pilares-processos.md`.

## Bancos de dados (databases) no Notion

Modelagem relacional — 6 databases ligados:

```
[Departamentos] 1──* [Pilares] 1──* [Processos] 1──* [Microprocessos] *──1 [POPs]
                                                            │
                                                            *──* [Rotinas/Agenda]
```

### 1. Departamentos
| Propriedade | Tipo | Ex. |
|---|---|---|
| Nome | Title | Financeiro |
| Sigla | Text | FIN |
| Responsável | Person | — |
| Objetivo | Text | — |

### 2. Pilares
| Propriedade | Tipo | Ex. |
|---|---|---|
| Nome | Title | Contas a Pagar |
| Sigla | Text | CAP |
| Departamento | Relation → Departamentos | Financeiro |
| Objetivo | Text | — |

### 3. Processos
| Propriedade | Tipo | Ex. |
|---|---|---|
| Nome | Title | Ciclo de pagamento a fornecedores |
| Pilar | Relation → Pilares | Contas a Pagar |
| Objetivo | Text | — |

### 4. Microprocessos  ← o database central
| Propriedade | Tipo | Ex. |
|---|---|---|
| Nome | Title | Conferência nota × pedido |
| ID | Text | FIN-CAP-003 |
| Processo | Relation → Processos | Ciclo de pagamento a fornecedores |
| Frequência | Select | sob demanda / diária / semanal / mensal |
| Gatilho | Text | Chegada de NF |
| Responsável | Person | — |
| Sistemas | Multi-select | ERP, Banco, Planilha, Notion |
| Estágio automação | Select | Documentado / Assistido / Automatizado |
| Comando | Text | /conferir-nota |
| Entradas | Text | — |
| Saídas | Text | — |
| Regras | Text | — |
| KPI | Text | — |
| POP | Relation → POPs | — |

### 5. POPs (Procedimentos Operacionais Padrão)
Página por POP com o passo a passo detalhado (o "como fazer").

### 6. Rotinas / Agenda
| Propriedade | Tipo | Ex. |
|---|---|---|
| Nome | Title | Fechamento de caixa diário |
| Microprocessos | Relation → Microprocessos | FIN-TES-001, 002, 003 |
| Frequência | Select | diária |
| Próxima execução | Date | — |
| Última execução | Date | — |
| Status | Select | OK / Pendente / Atrasada |

## Integração técnica (Notion API)

- **Autenticação:** criar uma *internal integration* em notion.so/my-integrations,
  pegar o token e compartilhar os databases com a integração.
- **Token:** guardar como variável de ambiente `NOTION_TOKEN` (**nunca** commitar).
- **IDs dos databases:** guardar em `.claude/notion.config.json` (sem segredos) ou env.
- **Operações que a automação fará:**
  - *Ler* fichas de microprocessos para executar uma rotina.
  - *Escrever* o resultado de uma execução (atualizar "Última execução", status, logs).
  - *Criar* itens (ex.: registrar uma pendência de conferência, um alerta de certidão).

### Como vamos popular o Notion

1. Definimos a ontologia aqui no repo (feito: `01`).
2. Geramos os itens iniciais (departamentos, pilares, processos, microprocessos dos
   arquivos `02`–`05`) e os inserimos no Notion via API — um comando `/sync-notion`.
3. A partir daí, repo e Notion permanecem espelhados.

> Decisão D7: o Notion vira o "mestre" da documentação (editamos lá e sincronizamos
> para o repo) **ou** o repo é o mestre (editamos aqui e empurramos para o Notion)?
> Recomendação: **repo como mestre da ontologia**, Notion como camada de leitura/operação.
