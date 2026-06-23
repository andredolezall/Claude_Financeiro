"""Conciliação dos lotes de boleto a partir do relatório de cobrança do BB.

O relatório "consultaCBR" (BB → Cobrança → Consulta de boletos) detalha cada boleto:
pagador, Nosso Número, **Seu Número (= NF da planilha)**, situação, data e valor de
liquidação. Boletos liquidados num mesmo dia caem no extrato como um único crédito
`COBRANÇA` — somando os boletos do dia reconstruímos esse lote e conciliamos exatamente.

Resolve a decisão D8 (ver docs/08): conciliação de recebíveis em lote, sem adivinhação.
Lê .xls (via xlrd) e .xlsx (stdlib).
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP

from .ofx import Extrato, Transacao

_COL = {
    "pagador": "Nome do Pagador",
    "cnpj": "CPF/CNPJ do Pagador",
    "emissao": "Emissão",
    "vencimento": "Vencimento",
    "nosso_numero": "Nosso Número",
    "seu_numero": "Seu Número",
    "situacao": "Situação",
    "data_liquidacao": "Data Situação",
    "valor": "Valor",
    "valor_liquidacao": "Valor Liquidação",
    "tipo_liquidacao": "Tipo Liquidação",
}


@dataclass
class Boleto:
    pagador: str
    cnpj: str
    seu_numero: str            # = NF na planilha CR
    nosso_numero: str
    vencimento: date | None
    situacao: str
    data_liquidacao: date | None
    valor: Decimal             # valor NOMINAL do boleto (a venda)
    valor_liquidacao: Decimal  # valor de fato creditado (nominal +/- ajuste)
    tipo_liquidacao: str

    @property
    def liquidado(self) -> bool:
        return self.data_liquidacao is not None and self.valor_liquidacao > 0

    @property
    def via_cobranca(self) -> bool:
        """True se liquida como crédito COBRANÇA no extrato (vs. PIX avulso)."""
        return self.tipo_liquidacao.strip().upper() != "PIX"

    @property
    def ajuste(self) -> Decimal:
        """Liquidação − nominal. Positivo = juros/multa; negativo = desconto."""
        return self.valor_liquidacao - self.valor

    @property
    def juros_multa(self) -> Decimal:
        return self.ajuste if self.ajuste > 0 else Decimal("0")

    @property
    def desconto(self) -> Decimal:
        return -self.ajuste if self.ajuste < 0 else Decimal("0")


@dataclass
class Lote:
    data: date
    tipo: str                  # "COBRANÇA" | "PIX"
    valor: Decimal             # soma do valor LIQUIDADO (o que casa com o extrato)
    boletos: list[Boleto] = field(default_factory=list)

    @property
    def valor_nominal(self) -> Decimal:
        return sum((b.valor for b in self.boletos), Decimal("0"))

    @property
    def juros_multa(self) -> Decimal:
        return sum((b.juros_multa for b in self.boletos), Decimal("0"))

    @property
    def desconto(self) -> Decimal:
        return sum((b.desconto for b in self.boletos), Decimal("0"))


@dataclass
class ResultadoBoletos:
    lotes_conciliados: list[tuple[Lote, list[Transacao]]] = field(default_factory=list)
    lotes_pendentes: list[Lote] = field(default_factory=list)
    lotes_fora_periodo: int = 0
    valor_fora_periodo: Decimal = Decimal("0")


# --------------------------------------------------------------------------- #
# Leitura do relatório (.xls / .xlsx)
# --------------------------------------------------------------------------- #
def _q2(v) -> Decimal:
    return Decimal(str(v)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _data(v) -> date | None:
    if v in (None, ""):
        return None
    s = str(v).strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _linhas(caminho: str) -> list[dict[str, object]]:
    if caminho.lower().endswith(".xlsx"):
        from .planilha import read_table
        return read_table(caminho, _aba_xlsx(caminho))
    # .xls binário → xlrd
    try:
        import xlrd
    except ImportError as e:
        raise RuntimeError(
            "Para ler o relatório de cobrança .xls é preciso o xlrd "
            "(`pip install xlrd`), ou exporte/salve como .xlsx."
        ) from e
    sh = xlrd.open_workbook(caminho).sheet_by_index(0)
    header = [str(sh.cell_value(0, c)).strip() for c in range(sh.ncols)]
    linhas = []
    for r in range(1, sh.nrows):
        linhas.append({header[c]: sh.cell_value(r, c) for c in range(sh.ncols)})
    return linhas


def _aba_xlsx(caminho: str) -> str:
    from .planilha import listar_abas
    abas = listar_abas(caminho)
    for a in abas:
        if "boleto" in a.lower() or "cobran" in a.lower():
            return a
    return abas[0]


def carregar_boletos(caminho: str) -> list[Boleto]:
    boletos: list[Boleto] = []
    for reg in _linhas(caminho):
        bruto = reg.get(_COL["valor_liquidacao"])
        if bruto in (None, ""):
            continue
        dliq = _data(reg.get(_COL["data_liquidacao"]))
        if dliq is None:                       # descarta total/rodapé (sem data)
            continue
        try:
            vliq = _q2(bruto)
        except Exception:
            continue
        seu = str(reg.get(_COL["seu_numero"]) or "").strip()
        if seu.endswith(".0"):
            seu = seu[:-2]
        boletos.append(
            Boleto(
                pagador=str(reg.get(_COL["pagador"]) or "").strip(),
                cnpj=str(reg.get(_COL["cnpj"]) or "").strip(),
                seu_numero=seu,
                nosso_numero=str(reg.get(_COL["nosso_numero"]) or "").strip(),
                vencimento=_data(reg.get(_COL["vencimento"])),
                situacao=str(reg.get(_COL["situacao"]) or "").strip(),
                data_liquidacao=dliq,
                valor=_q2(reg.get(_COL["valor"]) or 0),
                valor_liquidacao=vliq,
                tipo_liquidacao=str(reg.get(_COL["tipo_liquidacao"]) or "").strip(),
            )
        )
    return boletos


# --------------------------------------------------------------------------- #
# Conciliação dos lotes contra o extrato
# --------------------------------------------------------------------------- #
def agrupar_lotes(boletos: list[Boleto]) -> list[Lote]:
    grupos: dict[tuple[date, str], list[Boleto]] = defaultdict(list)
    for b in boletos:
        if not b.liquidado:
            continue
        bucket = "COBRANÇA" if b.via_cobranca else "PIX"
        grupos[(b.data_liquidacao, bucket)].append(b)
    lotes = []
    for (d, tipo), bs in grupos.items():
        total = sum((b.valor_liquidacao for b in bs), Decimal("0"))
        lotes.append(Lote(data=d, tipo=tipo, valor=total, boletos=bs))
    return sorted(lotes, key=lambda l: (l.data, l.tipo))


def conciliar(
    boletos: list[Boleto],
    extratos: list[Extrato],
    janela_dias: int = 1,
) -> ResultadoBoletos:
    todas = [t for ext in extratos for t in ext.transacoes]
    creditos = [t for t in todas if t.entrada]
    dmin = min((t.data for t in todas), default=None)
    dmax = max((t.data for t in todas), default=None)
    usados: set[int] = set()
    res = ResultadoBoletos()

    for lote in agrupar_lotes(boletos):
        if dmin is None or lote.data < dmin or lote.data > dmax:
            res.lotes_fora_periodo += 1
            res.valor_fora_periodo += lote.valor
            continue
        chave = "COBRAN" if lote.tipo == "COBRANÇA" else "PIX"
        # candidatos: créditos do tipo, na data (±janela), ainda não usados
        cands = [
            (i, t) for i, t in enumerate(creditos)
            if i not in usados
            and chave in t.descricao.upper()
            and abs((t.data - lote.data).days) <= janela_dias
        ]
        # 1) tenta os créditos da data exata; 2) tenta todos os candidatos
        mesma = [(i, t) for i, t in cands if t.data == lote.data]
        escolha = None
        for grupo in (mesma, cands):
            if grupo and sum((t.valor for _, t in grupo), Decimal("0")) == lote.valor:
                escolha = grupo
                break
        if escolha:
            for i, _ in escolha:
                usados.add(i)
            res.lotes_conciliados.append((lote, [t for _, t in escolha]))
        else:
            res.lotes_pendentes.append(lote)
    return res


# --------------------------------------------------------------------------- #
# Relatório
# --------------------------------------------------------------------------- #
def tabela_liquidacoes(boletos: list[Boleto]) -> list[dict[str, object]]:
    """Uma linha por boleto liquidado, pronta para preencher a aba CR.

    Chave de casamento na planilha: NF + VALOR NOMINAL (há NFs com parcelas
    de mesmo valor — nesses casos cada linha CR corresponde a um boleto).
    """
    linhas = []
    for b in boletos:
        if not b.liquidado:
            continue
        linhas.append({
            "NF": b.seu_numero,
            "VALOR NOMINAL": f"{b.valor:.2f}",
            "PAGO?": "S",
            "DATA RECEBIMENTO": b.data_liquidacao.strftime("%d/%m/%Y"),
            "VALOR LIQUIDADO": f"{b.valor_liquidacao:.2f}",
            "JUROS/MULTA": f"{b.juros_multa:.2f}",
            "DESCONTO": f"{b.desconto:.2f}",
            "FORMA": b.tipo_liquidacao,
            "PAGADOR": b.pagador,
        })
    return sorted(linhas, key=lambda x: (x["DATA RECEBIMENTO"], x["NF"]))


def escrever_csv(linhas: list[dict[str, object]], caminho: str) -> None:
    import csv
    if not linhas:
        return
    with open(caminho, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(linhas[0].keys()), delimiter=";")
        w.writeheader()
        w.writerows(linhas)


def _brl(v: Decimal) -> str:
    return "R$ " + f"{v:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")


def relatorio_texto(res: ResultadoBoletos) -> str:
    n_ok = len(res.lotes_conciliados)
    n_pd = len(res.lotes_pendentes)
    lotes_ok = [l for l, _ in res.lotes_conciliados]
    val_ok = sum((l.valor for l in lotes_ok), Decimal("0"))
    nominal = sum((l.valor_nominal for l in lotes_ok), Decimal("0"))
    juros = sum((l.juros_multa for l in lotes_ok), Decimal("0"))
    desconto = sum((l.desconto for l in lotes_ok), Decimal("0"))
    val_pd = sum((l.valor for l in res.lotes_pendentes), Decimal("0"))
    bol_ok = sum(len(l.boletos) for l in lotes_ok)
    com_ajuste = [b for l in lotes_ok for b in l.boletos if b.ajuste != 0]

    L = ["# Conciliação de boletos (lotes de cobrança)", ""]
    L.append(f"- Lotes conciliados: {n_ok}/{n_ok + n_pd} — {_brl(val_ok)} ({bol_ok} boletos)")
    L.append(f"- Lotes pendentes (no período do OFX): {n_pd} — {_brl(val_pd)}")
    if res.lotes_fora_periodo:
        L.append(f"- (Fora do período do OFX: {res.lotes_fora_periodo} lotes — {_brl(res.valor_fora_periodo)})")
    L.append("")
    L.append("## Composição dos recebimentos conciliados")
    L.append(f"- Valor nominal (vendas):    {_brl(nominal)}")
    L.append(f"- (+) Juros/multa recebidos: {_brl(juros)}   ← receita financeira")
    L.append(f"- (−) Descontos concedidos:  {_brl(desconto)}")
    L.append(f"- (=) Total liquidado:       {_brl(val_ok)}")
    L.append("")
    if com_ajuste:
        L.append("### Boletos com juros/multa ou desconto")
        for b in sorted(com_ajuste, key=lambda x: -abs(x.ajuste)):
            tag = "juros/multa" if b.ajuste > 0 else "desconto"
            L.append(
                f"- NF {b.seu_numero} {b.pagador[:24]} — nominal {_brl(b.valor)} "
                f"→ liquidado {_brl(b.valor_liquidacao)} ({tag} {_brl(abs(b.ajuste))})"
            )
        L.append("")
    if res.lotes_pendentes:
        L.append("## ⚠️ Lotes sem crédito correspondente no extrato")
        L.append("_Possível: fora do período do OFX, liquidação avulsa, ou tarifa._")
        for l in res.lotes_pendentes:
            L.append(f"- {l.data} [{l.tipo}] {_brl(l.valor)} — {len(l.boletos)} boleto(s)")
    return "\n".join(L)
