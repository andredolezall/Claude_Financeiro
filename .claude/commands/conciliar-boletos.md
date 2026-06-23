---
description: Concilia os lotes de boleto (relatório consultaCBR do BB) com os créditos do OFX
argument-hint: --boletos consultaCBR.xls extrato.ofx
---

Concilie os boletos liquidados (relatório de cobrança do BB) com os créditos COBRANÇA
do extrato. Boletos liquidados no mesmo dia caem como um único crédito no banco — o
comando reconstrói cada lote somando os boletos e casa com o crédito correspondente.

Passos:
1. Execute: `python3 -m financeiro.cli boletos $ARGUMENTS`
   - `--boletos` recebe o relatório `consultaCBR` (.xls ou .xlsx) do BB
     (BB PJ → Cobrança → Consulta de boletos → exportar).
   - Para .xls é necessário `xlrd` (`pip install xlrd`); .xlsx lê sem dependência.
2. Apresente o relatório: lotes conciliados (ao centavo), pendentes no período e
   quantos ficaram fora do período do OFX.
3. Para cada lote **pendente**, investigue: normalmente é efeito de borda (boleto
   liquidado no último dia do extrato, creditado no dia seguinte) ou tarifa.

Dica: para fechar um mês inteiro, use um OFX e um relatório de cobrança do **mesmo
período**. Cada boleto traz `Seu Número` = NF, ligando o crédito à venda na planilha CR.
Microprocessos: FIN-CAR-003, FIN-TES-002.
