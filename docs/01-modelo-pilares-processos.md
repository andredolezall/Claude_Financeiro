# 01 — Modelo: Pilares, Processos e Microprocessos

Este documento define a **ontologia** da operação: como nomeamos e estruturamos tudo.
É o contrato compartilhado entre a documentação (Notion) e a automação (repositório).

## Hierarquia

```
Departamento            (Financeiro | Controladoria | Fiscal | RH)
 └─ Pilar               agrupamento de responsabilidades (ex.: Contas a Pagar)
     └─ Processo        fluxo ponta a ponta (ex.: Ciclo de pagamento a fornecedores)
         └─ Microprocesso   etapa atômica e repetível (ex.: Conferência nota × pedido)
             └─ Tarefa/Rotina   execução concreta, agendável (ex.: rodar toda 2ª-feira)
```

Atributos transversais a tudo:
- **Responsável (RACI):** quem executa / aprova / é consultado / é informado.
- **Frequência:** diária, semanal, quinzenal, mensal, sob demanda.
- **Gatilho:** o que dispara (data, evento, recebimento de e-mail, etc.).
- **Sistemas:** ERP, banco, planilha, Notion, e-mail.
- **Estágio de automação:** `Documentado → Assistido → Automatizado`.

## Ficha-padrão do Microprocesso

Todo microprocesso é descrito por esta ficha (mesma estrutura no Notion e no repositório).
É o que torna a operação **documentável hoje e automatizável amanhã sem mudar o formato.**

```yaml
id: FIN-CAP-003                 # Departamento-Pilar-sequência
nome: Conferência nota × pedido
departamento: Financeiro
pilar: Contas a Pagar
processo: Ciclo de pagamento a fornecedores
objetivo: Garantir que a NF recebida corresponde ao pedido/contrato antes de pagar.
gatilho: Chegada de NF de fornecedor (e-mail/ERP)
frequencia: sob demanda
responsavel:
  executa: Operador
  aprova: Operador
entradas:
  - NF do fornecedor (XML/PDF)
  - Pedido de compra / contrato
saidas:
  - NF validada e classificada (centro de custo, conta contábil)
  - Pendência registrada (se divergência)
passos:
  - Extrair valor, CNPJ, itens e impostos da NF
  - Comparar com pedido/contrato (valor, quantidade, condições)
  - Classificar centro de custo e conta contábil
  - Registrar no ERP / agendar pagamento OU abrir pendência
regras:
  - Divergência > 2% bloqueia agendamento e exige aprovação
  - Sem pedido correspondente → marcar como "sem respaldo"
sistemas: [ERP, e-mail, Notion]
kpi:
  - "% de NFs conferidas sem divergência"
  - "Tempo médio de conferência"
estagio_automacao: Documentado     # Documentado | Assistido | Automatizado
comando_relacionado: /conferir-nota   # quando existir
sop: link-para-o-POP
```

### Convenção de IDs

`DEP-PILAR-NNN`, onde:
- **DEP**: `FIN` (Financeiro), `CTR` (Controladoria), `FIS` (Fiscal), `RH`.
- **PILAR**: sigla de 3 letras (ex.: `CAP` Contas a Pagar, `CAR` Contas a Receber, `TES` Tesouraria).
- **NNN**: sequência por pilar.

Exemplos: `FIN-CAP-001`, `FIS-EMI-002`, `CTR-FEC-001`, `RH-FOL-004`.

## Os três estágios de automação

| Estágio | O que significa | O que o operador faz |
|---------|-----------------|----------------------|
| **Documentado** | A ficha e o POP existem. Execução 100% manual seguindo o passo a passo. | Tudo na mão, com checklist. |
| **Assistido** | Claude Code lê a ficha + dados e gera rascunhos, confere e aponta divergências. Operador revisa e confirma. | Revisa e aprova. |
| **Automatizado** | Comando executa ponta a ponta com regras claras; só decisões/exceções sobem ao operador. | Aprova exceções. |

Regra de migração: um microprocesso só sobe de estágio quando suas **regras** estão
explícitas e testadas. Sem regra clara, não automatiza.

## Mapa de Departamentos e Pilares (visão macro)

| Departamento | Pilares |
|---|---|
| **Financeiro** | Contas a Pagar · Contas a Receber · Tesouraria (Caixa & Bancos) · Cadastros & Compliance financeiro |
| **Fiscal** | Emissão de Documentos Fiscais · Apuração de Tributos · Obrigações Acessórias · Certidões & Compliance |
| **Controladoria** | Fechamento Mensal · DRE Gerencial & Orçamento · KPIs & Relatórios · Custos & Precificação |
| **RH** | Admissão & Desligamento · Folha & Benefícios · Ponto & Jornada · Compliance Trabalhista |

Detalhamento por departamento nos arquivos `02` a `05`. **Financeiro** e **Fiscal** estão
detalhados (prioridade); **Controladoria** e **RH** estão esboçados.
