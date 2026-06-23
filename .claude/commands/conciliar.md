---
description: Concilia extrato(s) OFX com títulos do MaxiProd (CSV) e aponta divergências
argument-hint: --titulos titulos.csv extrato.ofx [outro.ofx ...]
---

Concilie o(s) extrato(s) bancário(s) OFX com os títulos em aberto (CSV exportado do
MaxiProd) e destaque o que precisa de ação humana.

Passos:
1. Execute: `python3 -m financeiro.cli conciliar $ARGUMENTS`
   - Os títulos vão em `--titulos`, aceitando dois formatos:
     - **Planilha .xlsx** (Fluxo de Caixa) → lê a aba `--aba "CR - Contas a Receber"`.
     - **CSV genérico**: `tipo;data_vencimento;valor;descricao;documento`.
   - Boletos liquidam em LOTE (créditos `COBRANÇA`): o casamento 1:1 não cobre tudo —
     ver `docs/08-calibracao-dados-reais.md` e a decisão D8 sobre conciliação por lote.
2. Apresente o relatório.
3. Para cada **título em aberto**, sugira a causa provável (atraso, valor divergente,
   ainda não pago/recebido) e a próxima ação.
4. Para cada **movimento sem título**, classifique (imposto, tarifa, etc.) e indique se
   deve virar um lançamento ou se falta cadastrar o título.

Regra: divergências de valor NÃO são casadas automaticamente — sobem para sua decisão.
Microprocessos relacionados: FIN-TES-002, FIN-CAR-003, FIN-CAP-008.
