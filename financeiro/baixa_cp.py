"""Sugestão de baixa de Contas a Pagar a partir do extrato (OFX).

Diferente do CR, o CP não tem chave única (NF) nem relatório-ponte. A confirmação
do pagamento é o débito no extrato — e só para o que passa pelo banco. Por isso este
módulo NÃO preenche automaticamente: classifica cada título em

  - SUGERIDO  : casou por valor+data com um débito, sem ambiguidade (alta confiança)
  - CONFERIR  : valor repetido, sem débito no extrato, ou forma que não passa no banco
                (cartão de crédito, dinheiro, folha) — exige fonte própria

A DATA PGTO sugerida é a data do débito (no CP isso casa com o lançamento manual).
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import Decimal

from .conciliacao import Titulo, carregar_cp_xlsx
from .ofx import Extrato

FORMAS_BANCO = {"boleto", "pix", "dda", "depósito", "deposito", "ted", "doc"}


@dataclass
class Sugestao:
    fornecedor: str
    classificacao: str
    valor: Decimal
    vencimento: date | None
    forma: str
    acao: str                 # "SUGERIDO" | "CONFERIR"
    motivo: str
    data_pgto: date | None


@dataclass
class ResultadoCP:
    sugestoes: list[Sugestao] = field(default_factory=list)

    @property
    def sugeridos(self) -> list[Sugestao]:
        return [s for s in self.sugestoes if s.acao == "SUGERIDO"]

    @property
    def conferir(self) -> list[Sugestao]:
        return [s for s in self.sugestoes if s.acao == "CONFERIR"]


def sugerir_baixa_cp(cp_titulos: list[Titulo], extratos: list[Extrato],
                     janela_dias: int = 3) -> ResultadoCP:
    transacoes = [t for ext in extratos for t in ext.transacoes]
    debitos = [t for t in transacoes if t.saida]
    dmin = min((t.data for t in transacoes), default=None)
    dmax = max((t.data for t in transacoes), default=None)
    banco = [t for t in cp_titulos if t.forma_pgto.strip().lower() in FORMAS_BANCO]
    freq = Counter(t.valor for t in banco)        # ambiguidade por valor
    usados: set[int] = set()
    res = ResultadoCP()

    for t in cp_titulos:
        forma = t.forma_pgto.strip().lower()
        base = dict(fornecedor=t.cliente, classificacao=t.documento, valor=t.valor,
                    vencimento=t.vencimento, forma=t.forma_pgto)
        if forma not in FORMAS_BANCO:
            res.sugestoes.append(Sugestao(**base, acao="CONFERIR",
                motivo=f"{t.forma_pgto or 'sem forma'} — não passa no extrato", data_pgto=None))
            continue
        alvo = t.data_esperada
        if alvo is None or dmin is None or alvo < dmin - timedelta(days=janela_dias) \
                or alvo > dmax + timedelta(days=janela_dias):
            res.sugestoes.append(Sugestao(**base, acao="CONFERIR",
                motivo="fora do período do extrato", data_pgto=None))
            continue
        cand = [i for i, d in enumerate(debitos)
                if i not in usados and abs(d.valor) == t.valor
                and abs((d.data - alvo).days) <= janela_dias]
        if not cand:
            res.sugestoes.append(Sugestao(**base, acao="CONFERIR",
                motivo="sem débito correspondente (outra conta?)", data_pgto=None))
            continue
        cand.sort(key=lambda i: abs((debitos[i].data - alvo).days))
        j = cand[0]
        usados.add(j)
        if freq[t.valor] > 1 or len(cand) > 1:
            res.sugestoes.append(Sugestao(**base, acao="CONFERIR",
                motivo="valor repetido — confirmar qual título", data_pgto=debitos[j].data))
        else:
            res.sugestoes.append(Sugestao(**base, acao="SUGERIDO",
                motivo="casou por valor+data", data_pgto=debitos[j].data))
    return res


def carregar_e_sugerir(planilha_xlsx: str, ofx_paths: list[str],
                       aba: str = "CP - Contas a Pagar", janela_dias: int = 3) -> ResultadoCP:
    from .ofx import parse_ofx
    cp = carregar_cp_xlsx(planilha_xlsx, aba=aba, apenas_pagos=False)
    extratos = [parse_ofx(p) for p in ofx_paths]
    return sugerir_baixa_cp(cp, extratos, janela_dias=janela_dias)


# --------------------------------------------------------------------------- #
def _brl(v: Decimal) -> str:
    return "R$ " + f"{v:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")


def relatorio_texto(res: ResultadoCP) -> str:
    sug = res.sugeridos
    conf = res.conferir
    motivos = Counter(s.motivo for s in conf)
    L = ["# Sugestão de baixa — Contas a Pagar (CP × extrato)", ""]
    L.append(f"- SUGERIDO (casou por valor+data, alta confiança): {len(sug)} — "
             f"{_brl(sum((s.valor for s in sug), Decimal('0')))}")
    L.append(f"- CONFERIR (sua decisão): {len(conf)} — "
             f"{_brl(sum((s.valor for s in conf), Decimal('0')))}")
    L.append("")
    L.append("## Motivos de CONFERIR")
    for m, n in motivos.most_common():
        L.append(f"- {m}: {n}")
    return "\n".join(L)


def escrever_csv(res: ResultadoCP, caminho: str) -> int:
    import csv
    prioridade = {"SUGERIDO": 0, "CONFERIR": 1}
    linhas = sorted(res.sugestoes, key=lambda s: (prioridade.get(s.acao, 2), s.fornecedor))
    with open(caminho, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["AÇÃO", "MOTIVO", "FORNECEDOR", "CLASSIFICAÇÃO", "VALOR",
                    "VENCIMENTO", "FORMA", "PAGO?", "DATA PGTO"])
        for s in linhas:
            venc = s.vencimento.strftime("%d/%m/%Y") if s.vencimento else ""
            data = s.data_pgto.strftime("%d/%m/%Y") if s.data_pgto else ""
            pago = "S" if s.acao == "SUGERIDO" else ""
            w.writerow([s.acao, s.motivo, s.fornecedor, s.classificacao,
                        f"{s.valor:.2f}", venc, s.forma, pago, data])
    return len(linhas)
