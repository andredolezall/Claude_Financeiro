---
description: Concilia a CR × boletos por NF e gera a tabela de preenchimento (PAGO?/data)
argument-hint: --planilha Fluxo.xlsx --boletos consultaCBR.xls [--saida out.csv]
---

Concilie a aba Contas a Receber com o relatório de cobrança no nível da **NF** e gere
o que falta preencher (PAGO? = S e DATA RECEBIMENTO), só nas linhas em branco.

Lógica (validada nos dados reais):
- Unidade = NF. Soma todas as linhas da CR (PVs) e todos os boletos da NF e bate as somas.
- Resolve "vários PVs → 1 boleto" e "1 NF em parcelas → vários boletos".
- Chave NF + valor nominal; FIFO por vencimento para desempate; **nunca** sobrescreve
  linha já marcada paga.
- NFs cuja soma não fecha viram "divergente" para sua conferência (não preenche).

Passos:
1. Execute: `python3 -m financeiro.cli preencher $ARGUMENTS`
2. Apresente o resumo (NFs conciliadas / divergentes / linhas a preencher).
3. Para as **divergentes**, investigue: parcela faltando no relatório, ajuste de
   centavos, ou valor renegociado.
4. Se gerou `--saida`, o CSV traz as linhas a preencher (chave NF + valor + vencimento)
   para alimentar a CR (manual, ou via Office Script no Power Automate).

Microprocessos: FIN-CAR-003, FIN-CAR-004.
