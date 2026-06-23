"""Conciliação extrato bancário (OFX) × títulos (CSV do MaxiProd).

Microprocessos FIN-TES-002, FIN-CAR-003, FIN-CAP-008. Casa cada movimento do
extrato com um título em aberto por valor idêntico e proximidade de data.
Decisão (aprovação/baixa) continua humana; aqui automatizamos a conferência.

Schema esperado do CSV de títulos (cabeçalho, separador ';' ou ','):
    tipo;data_vencimento;valor;descricao;documento
onde tipo ∈ {pagar, receber}, data no formato AAAA-MM-DD ou DD/MM/AAAA,
valor positivo (o sinal é inferido pelo tipo).
"""

from __future__ import annotations

import csv
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal

from .ofx import Extrato, Transacao


@dataclass
class Titulo:
    tipo: str               # "pagar" | "receber"
    vencimento: date
    valor: Decimal          # sempre positivo
    descricao: str
    documento: str


@dataclass
class Match:
    titulo: Titulo
    transacao: Transacao
    dias_diferenca: int


@dataclass
class ResultadoConciliacao:
    conciliados: list[Match] = field(default_factory=list)
    titulos_em_aberto: list[Titulo] = field(default_factory=list)      # sem correspondência
    extrato_sem_titulo: list[Transacao] = field(default_factory=list)  # movimento sem título


def _parse_data(valor: str) -> date:
    valor = valor.strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y%m%d"):
        try:
            return datetime.strptime(valor, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Data inválida: {valor!r}")


def _parse_valor(valor: str) -> Decimal:
    v = valor.strip().replace("R$", "").replace(" ", "")
    # trata 1.234,56 (pt-BR) e 1234.56
    if "," in v and "." in v:
        v = v.replace(".", "").replace(",", ".")
    elif "," in v:
        v = v.replace(",", ".")
    return abs(Decimal(v))


def carregar_titulos(caminho: str) -> list[Titulo]:
    with open(caminho, encoding="utf-8-sig", newline="") as f:
        amostra = f.read(2048)
        f.seek(0)
        sep = ";" if amostra.count(";") >= amostra.count(",") else ","
        leitor = csv.DictReader(f, delimiter=sep)
        titulos = []
        for linha in leitor:
            linha = { (k or "").strip().lower(): (v or "").strip() for k, v in linha.items() }
            titulos.append(
                Titulo(
                    tipo=linha["tipo"].lower(),
                    vencimento=_parse_data(linha["data_vencimento"]),
                    valor=_parse_valor(linha["valor"]),
                    descricao=linha.get("descricao", ""),
                    documento=linha.get("documento", ""),
                )
            )
    return titulos


def conciliar(
    extratos: list[Extrato],
    titulos: list[Titulo],
    janela_dias: int = 3,
) -> ResultadoConciliacao:
    transacoes = [t for ext in extratos for t in ext.transacoes]
    usadas: set[int] = set()
    resultado = ResultadoConciliacao()

    for titulo in titulos:
        esperado_credito = titulo.tipo == "receber"
        melhor_idx = None
        melhor_dias = None
        for idx, t in enumerate(transacoes):
            if idx in usadas:
                continue
            if t.entrada != esperado_credito:
                continue
            if abs(t.valor) != titulo.valor:
                continue
            dias = abs((t.data - titulo.vencimento).days)
            if dias > janela_dias:
                continue
            if melhor_dias is None or dias < melhor_dias:
                melhor_dias, melhor_idx = dias, idx
        if melhor_idx is not None:
            usadas.add(melhor_idx)
            resultado.conciliados.append(
                Match(titulo=titulo, transacao=transacoes[melhor_idx], dias_diferenca=melhor_dias)
            )
        else:
            resultado.titulos_em_aberto.append(titulo)

    resultado.extrato_sem_titulo = [t for i, t in enumerate(transacoes) if i not in usadas]
    return resultado


def relatorio_texto(r: ResultadoConciliacao) -> str:
    def brl(v: Decimal) -> str:
        return "R$ " + f"{v:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")

    total = len(r.conciliados) + len(r.titulos_em_aberto)
    pct = (len(r.conciliados) / total * 100) if total else 0
    linhas = ["# Conciliação bancária", ""]
    linhas.append(f"- Títulos conciliados: {len(r.conciliados)}/{total} ({pct:.0f}%)")
    linhas.append(f"- Títulos em aberto (sem correspondência): {len(r.titulos_em_aberto)}")
    linhas.append(f"- Movimentos do extrato sem título: {len(r.extrato_sem_titulo)}")
    linhas.append("")
    if r.titulos_em_aberto:
        linhas.append("## ⚠️ Títulos em aberto (verificar)")
        for t in r.titulos_em_aberto:
            linhas.append(f"- [{t.tipo}] {t.documento} {t.descricao} — {brl(t.valor)} venc. {t.vencimento}")
        linhas.append("")
    if r.extrato_sem_titulo:
        linhas.append("## ⚠️ Movimentos sem título (classificar / lançar)")
        for t in r.extrato_sem_titulo:
            linhas.append(f"- {t.data} {brl(t.valor)} — {t.descricao}")
    return "\n".join(linhas)
