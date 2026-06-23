"""Conciliação CR × boletos no nível da NF, para preencher a aba Contas a Receber.

Unidade de conciliação = NF. Para cada NF, soma todas as linhas da CR (PVs) e todos
os boletos do relatório, e bate as somas. Resolve os dois cenários reais:

- Vários PVs na CR → 1 boleto pela NF inteira (soma das linhas = nominal do boleto).
- 1 NF em várias parcelas → vários boletos (casamento 1:1 por valor, FIFO por vencimento).

Decide, por linha da CR: marcar PAGO? = S e a DATA RECEBIMENTO, **só em linhas em branco**
(nunca sobrescreve o que já está pago). O que não fecha vira status de revisão.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal

from .boletos import Boleto, carregar_boletos
from .conciliacao import Titulo, carregar_cr_xlsx


def _nf(v: str) -> str:
    v = str(v or "").strip()
    return v[:-2] if v.endswith(".0") else v


@dataclass
class DecisaoLinha:
    nf: str
    valor: Decimal
    vencimento: date | None
    cliente: str
    ja_pago: bool
    preencher: bool                 # marcar PAGO? = S
    data_recebimento: date | None
    status: str                     # conciliado | ja_pago | sem_boleto | ambiguo | divergente


@dataclass
class ResultadoNF:
    nf: str
    soma_cr: Decimal
    soma_boletos: Decimal
    status: str                     # conciliado | divergente | sem_boleto
    linhas: list[DecisaoLinha] = field(default_factory=list)


@dataclass
class Resumo:
    nfs: list[ResultadoNF] = field(default_factory=list)

    @property
    def a_preencher(self) -> list[DecisaoLinha]:
        return [l for nf in self.nfs for l in nf.linhas if l.preencher]

    def por_status_nf(self) -> dict[str, int]:
        d: dict[str, int] = defaultdict(int)
        for nf in self.nfs:
            d[nf.status] += 1
        return dict(d)


def _datas_para_linhas(rows: list[Titulo], bols: list[Boleto]) -> dict[int, date | None]:
    """Atribui a cada linha CR (por índice) a data de liquidação de um boleto.

    - 1 boleto p/ várias linhas (vários PVs): todas recebem a data do boleto.
    - N boletos (parcelas): casa por valor; FIFO por vencimento; sobra → data mais antiga.
    """
    datas: dict[int, date | None] = {}
    if len(bols) == 1:
        return {i: bols[0].data_liquidacao for i in range(len(rows))}
    disponiveis = sorted(bols, key=lambda b: (b.data_liquidacao or date.max))
    usados: set[int] = set()
    ordem = sorted(range(len(rows)), key=lambda i: (rows[i].vencimento or date.max))
    for i in ordem:
        alvo = rows[i].valor
        escolhido = None
        for j, b in enumerate(disponiveis):              # 1º: boleto de mesmo valor
            if j not in usados and b.valor == alvo:
                escolhido = j
                break
        if escolhido is None:                            # 2º: boleto mais antigo livre
            for j, b in enumerate(disponiveis):
                if j not in usados:
                    escolhido = j
                    break
        if escolhido is not None:
            usados.add(escolhido)
            datas[i] = disponiveis[escolhido].data_liquidacao
        else:
            datas[i] = disponiveis[-1].data_liquidacao
    return datas


def conciliar_por_nf(cr_titulos: list[Titulo], boletos: list[Boleto]) -> Resumo:
    bol_por_nf: dict[str, list[Boleto]] = defaultdict(list)
    for b in boletos:
        if b.liquidado:
            bol_por_nf[_nf(b.seu_numero)].append(b)
    cr_por_nf: dict[str, list[Titulo]] = defaultdict(list)
    for t in cr_titulos:
        cr_por_nf[_nf(t.documento)].append(t)

    resumo = Resumo()
    for nf, rows in sorted(cr_por_nf.items()):
        bols = bol_por_nf.get(nf, [])
        soma_cr = sum((t.valor for t in rows), Decimal("0"))
        soma_bol = sum((b.valor for b in bols), Decimal("0"))

        if not bols:
            res = ResultadoNF(nf, soma_cr, soma_bol, "sem_boleto")
            for t in rows:
                res.linhas.append(DecisaoLinha(nf, t.valor, t.vencimento, t.cliente,
                                               t.pago, False, None, "sem_boleto"))
            resumo.nfs.append(res)
            continue

        # caso ambíguo: boletos idênticos (mesmo valor e mesma data) e nº != linhas
        valores_bol = sorted((b.valor, b.data_liquidacao) for b in bols)
        ambiguo = len(bols) > 1 and len(set(valores_bol)) < len(valores_bol) and len(bols) != len(rows)

        if soma_cr == soma_bol and not ambiguo:
            datas = _datas_para_linhas(rows, bols)
            res = ResultadoNF(nf, soma_cr, soma_bol, "conciliado")
            for i, t in enumerate(rows):
                if t.pago:
                    res.linhas.append(DecisaoLinha(nf, t.valor, t.vencimento, t.cliente,
                                                   True, False, t.data_recebimento, "ja_pago"))
                else:
                    res.linhas.append(DecisaoLinha(nf, t.valor, t.vencimento, t.cliente,
                                                   False, True, datas.get(i), "conciliado"))
            resumo.nfs.append(res)
        else:
            status = "divergente"
            res = ResultadoNF(nf, soma_cr, soma_bol, status)
            for t in rows:
                st = "ambiguo" if ambiguo else "divergente"
                res.linhas.append(DecisaoLinha(nf, t.valor, t.vencimento, t.cliente,
                                               t.pago, False, None, st))
            resumo.nfs.append(res)
    return resumo


def carregar_e_conciliar(planilha_xlsx: str, boletos_xls: str,
                         aba: str = "CR - Contas a Receber") -> Resumo:
    cr = carregar_cr_xlsx(planilha_xlsx, aba=aba, apenas_pagos=False)
    bol = carregar_boletos(boletos_xls)
    return conciliar_por_nf(cr, bol)


# --------------------------------------------------------------------------- #
def _brl(v: Decimal) -> str:
    return "R$ " + f"{v:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")


def escrever_csv_preenchimento(resumo: Resumo, caminho: str) -> int:
    """Escreve só as linhas a preencher (chave NF + valor nominal + vencimento)."""
    import csv
    linhas = resumo.a_preencher
    with open(caminho, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["NF", "VALOR NOMINAL", "VENCIMENTO", "PAGO?", "DATA RECEBIMENTO"])
        for l in linhas:
            venc = l.vencimento.strftime("%d/%m/%Y") if l.vencimento else ""
            data = l.data_recebimento.strftime("%d/%m/%Y") if l.data_recebimento else ""
            w.writerow([l.nf, f"{l.valor:.2f}", venc, "S", data])
    return len(linhas)


def escrever_csv_completo(resumo: Resumo, caminho: str,
                          incluir_ja_pago: bool = False,
                          incluir_sem_boleto: bool = False) -> int:
    """Escreve TUDO que é acionável: linhas a PREENCHER e NFs a DECIDIR (divergentes/
    ambíguas), com o comparativo de soma por NF. As 'DECIDIR' aparecem primeiro.
    """
    import csv
    prioridade = {"DECIDIR": 0, "PREENCHER": 1, "": 2}
    registros = []
    for nf in resumo.nfs:
        dif = nf.soma_cr - nf.soma_boletos
        for l in nf.linhas:
            if l.status == "ja_pago" and not incluir_ja_pago:
                continue
            if l.status == "sem_boleto" and not incluir_sem_boleto:
                continue
            if l.preencher:
                acao = "PREENCHER"
            elif l.status in ("divergente", "ambiguo"):
                acao = "DECIDIR"
            else:
                acao = ""
            venc = l.vencimento.strftime("%d/%m/%Y") if l.vencimento else ""
            data = l.data_recebimento.strftime("%d/%m/%Y") if l.data_recebimento else ""
            registros.append((prioridade.get(acao, 3), l.nf, [
                acao, l.status, l.nf, l.cliente, f"{l.valor:.2f}", venc,
                "S" if l.preencher else "", data,
                f"{nf.soma_cr:.2f}", f"{nf.soma_boletos:.2f}", f"{dif:.2f}",
            ]))
    registros.sort(key=lambda r: (r[0], r[1]))
    with open(caminho, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["AÇÃO", "STATUS", "NF", "CLIENTE", "VALOR NOMINAL", "VENCIMENTO",
                    "PAGO?", "DATA RECEBIMENTO", "SOMA CR (NF)", "SOMA BOLETOS (NF)", "DIFERENÇA"])
        for _, _, linha in registros:
            w.writerow(linha)
    return len(registros)


def relatorio_texto(resumo: Resumo) -> str:
    st = resumo.por_status_nf()
    linhas_fill = resumo.a_preencher
    val_fill = sum((l.valor for l in linhas_fill), Decimal("0"))
    L = ["# Preenchimento da CR por NF (conciliação CR × boletos)", ""]
    L.append(f"- NFs conciliadas: {st.get('conciliado', 0)}")
    L.append(f"- NFs divergentes (revisar): {st.get('divergente', 0)}")
    L.append(f"- NFs sem boleto no relatório: {st.get('sem_boleto', 0)}")
    L.append(f"- **Linhas a preencher (PAGO=S + data): {len(linhas_fill)} — {_brl(val_fill)}**")
    L.append("")
    divs = [nf for nf in resumo.nfs if nf.status == "divergente"]
    if divs:
        L.append("## ⚠️ NFs divergentes (soma CR ≠ soma boletos) — conferir")
        for nf in divs[:15]:
            L.append(f"- NF {nf.nf}: CR {_brl(nf.soma_cr)} × boletos {_brl(nf.soma_boletos)}")
        if len(divs) > 15:
            L.append(f"- … +{len(divs) - 15} NFs")
    return "\n".join(L)
