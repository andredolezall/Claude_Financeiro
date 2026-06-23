"""Posição de caixa e resumo do movimento a partir de um ou mais extratos OFX.

Microprocessos FIN-TES-002/003. Não projeta o futuro (isso exige os títulos em
aberto — ver conciliacao.py); aqui consolidamos o que de fato ocorreu.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from decimal import Decimal

from .categorias import categorizar
from .ofx import Extrato


@dataclass
class ResumoFluxo:
    saldo_final: Decimal | None
    total_entradas: Decimal
    total_saidas: Decimal
    movimento_liquido: Decimal
    por_categoria: dict[str, Decimal]
    por_dia: dict[str, Decimal]
    qtd_transacoes: int


def resumir(extratos: list[Extrato]) -> ResumoFluxo:
    por_categoria: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
    por_dia: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
    entradas = Decimal("0")
    saidas = Decimal("0")
    qtd = 0
    saldo_final: Decimal | None = None

    for ext in extratos:
        if ext.saldo is not None:
            saldo_final = (saldo_final or Decimal("0")) + ext.saldo
        for t in ext.transacoes:
            qtd += 1
            cat = categorizar(t.descricao)
            por_categoria[cat] += t.valor
            por_dia[t.data.isoformat()] += t.valor
            if t.entrada:
                entradas += t.valor
            else:
                saidas += t.valor

    return ResumoFluxo(
        saldo_final=saldo_final,
        total_entradas=entradas,
        total_saidas=saidas,
        movimento_liquido=entradas + saidas,
        por_categoria=dict(sorted(por_categoria.items(), key=lambda kv: kv[1])),
        por_dia=dict(sorted(por_dia.items())),
        qtd_transacoes=qtd,
    )


def _brl(valor: Decimal | None) -> str:
    if valor is None:
        return "—"
    s = f"{valor:,.2f}"
    return "R$ " + s.replace(",", "_").replace(".", ",").replace("_", ".")


def relatorio_texto(resumo: ResumoFluxo) -> str:
    linhas = ["# Posição de caixa e fluxo do período", ""]
    linhas.append(f"- Transações: {resumo.qtd_transacoes}")
    linhas.append(f"- Entradas:   {_brl(resumo.total_entradas)}")
    linhas.append(f"- Saídas:     {_brl(resumo.total_saidas)}")
    linhas.append(f"- Movimento líquido: {_brl(resumo.movimento_liquido)}")
    linhas.append(f"- Saldo final (ledger): {_brl(resumo.saldo_final)}")
    linhas.append("")
    linhas.append("## Por categoria")
    for cat, val in resumo.por_categoria.items():
        linhas.append(f"- {cat}: {_brl(val)}")
    return "\n".join(linhas)
