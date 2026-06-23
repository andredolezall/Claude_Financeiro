---
description: Posição de caixa e fluxo do período a partir de extrato(s) OFX
argument-hint: caminho/para/extrato.ofx [outro.ofx ...]
---

Gere a posição de caixa e o resumo de fluxo a partir do(s) extrato(s) OFX informado(s).

Passos:
1. Execute: `python3 -m financeiro.cli fluxo $ARGUMENTS`
2. Apresente o relatório retornado.
3. Comente brevemente os destaques: maior categoria de saída, movimento líquido
   (positivo/negativo) e qualquer valor em "Não classificado" que mereça uma nova regra
   de categorização (ver `financeiro/categorias.py`).

Se nenhum arquivo for informado em $ARGUMENTS, peça o caminho do extrato OFX
(o operador extrai do banco). Microprocessos relacionados: FIN-TES-002/003.
