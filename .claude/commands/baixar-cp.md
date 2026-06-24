---
description: Sugere a baixa de Contas a Pagar cruzando a aba CP com os débitos do OFX
argument-hint: --planilha Fluxo.xlsx extrato.ofx [--saida out.csv]
---

Cruze a aba Contas a Pagar com os débitos do extrato e gere **sugestões de baixa**.
O CP não tem chave única (NF) nem relatório-ponte, então este comando NÃO preenche
sozinho: classifica cada título em

- **SUGERIDO**: casou por valor+data com um débito, sem ambiguidade (alta confiança).
- **CONFERIR**: valor repetido, sem débito no extrato (outra conta?), ou forma que não
  passa no banco (cartão de crédito, dinheiro, folha) — exige fonte própria.

Passos:
1. Execute: `python3 -m financeiro.cli baixar-cp $ARGUMENTS`
2. Apresente o resumo (SUGERIDO × CONFERIR + motivos).
3. Para CONFERIR por "cartão/folha", lembre que a ponte é a fatura do cartão / a folha.
4. Se gerou `--saida`, o CSV traz SUGERIDO primeiro (PAGO=S + data) e depois CONFERIR.

A DATA PGTO sugerida é a data do débito (validado: 153/153 iguais ao lançamento manual
em junho). Microprocessos: FIN-CAP-005/008.
