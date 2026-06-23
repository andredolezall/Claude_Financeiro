---
description: Concilia extrato(s) OFX com títulos do MaxiProd (CSV) e aponta divergências
argument-hint: --titulos titulos.csv extrato.ofx [outro.ofx ...]
---

Concilie o(s) extrato(s) bancário(s) OFX com os títulos em aberto (CSV exportado do
MaxiProd) e destaque o que precisa de ação humana.

Passos:
1. Execute: `python3 -m financeiro.cli conciliar $ARGUMENTS`
   (o CSV de títulos vai em `--titulos`; o schema esperado está em
   `financeiro/conciliacao.py`: `tipo;data_vencimento;valor;descricao;documento`).
2. Apresente o relatório.
3. Para cada **título em aberto**, sugira a causa provável (atraso, valor divergente,
   ainda não pago/recebido) e a próxima ação.
4. Para cada **movimento sem título**, classifique (imposto, tarifa, etc.) e indique se
   deve virar um lançamento ou se falta cadastrar o título.

Regra: divergências de valor NÃO são casadas automaticamente — sobem para sua decisão.
Microprocessos relacionados: FIN-TES-002, FIN-CAR-003, FIN-CAP-008.
