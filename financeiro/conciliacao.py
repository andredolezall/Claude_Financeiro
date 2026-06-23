"""Conciliação extrato bancário (OFX) × títulos.

Microprocessos FIN-TES-002, FIN-CAR-003, FIN-CAP-008. Casa cada movimento do
extrato com um título por valor idêntico e proximidade de data. A decisão
(aprovação/baixa) continua humana; aqui automatizamos a conferência e destacamos
o que precisa de atenção.

Fontes de títulos suportadas:
- CSV genérico (`carregar_titulos`): tipo;data_vencimento;valor;descricao;documento
- Planilha de Fluxo de Caixa, aba "CR - Contas a Receber" (`carregar_cr_xlsx`).
"""

from __future__ import annotations

import csv
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP

from .categorias import categorizar
from .ofx import Extrato, Transacao
from .planilha import excel_serial_to_date, read_table


@dataclass
class Titulo:
    tipo: str               # "pagar" | "receber"
    vencimento: date | None
    valor: Decimal          # sempre positivo
    descricao: str
    documento: str
    # Campos extras (planilha CR) — opcionais
    cliente: str = ""
    data_recebimento: date | None = None
    pago: bool = False
    forma_pgto: str = ""
    centro: str = ""

    @property
    def data_esperada(self) -> date | None:
        """Data em que se espera ver o movimento no banco."""
        return self.data_recebimento or self.vencimento


@dataclass
class Match:
    titulo: Titulo
    transacao: Transacao
    dias_diferenca: int


@dataclass
class ResultadoConciliacao:
    conciliados: list[Match] = field(default_factory=list)
    titulos_em_aberto: list[Titulo] = field(default_factory=list)      # esperados, sem crédito
    extrato_sem_titulo: list[Transacao] = field(default_factory=list)  # movimento sem título
    ignorados_fora_periodo: int = 0                                    # títulos fora do extrato


# --------------------------------------------------------------------------- #
# Parsing de valores/datas
# --------------------------------------------------------------------------- #
def _q2(v: Decimal) -> Decimal:
    return v.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _parse_data(valor: str) -> date:
    valor = valor.strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y%m%d"):
        try:
            return datetime.strptime(valor, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Data inválida: {valor!r}")


def _parse_valor(valor: str) -> Decimal:
    v = str(valor).strip().replace("R$", "").replace(" ", "")
    if "," in v and "." in v:               # 1.234,56 (pt-BR)
        v = v.replace(".", "").replace(",", ".")
    elif "," in v:                          # 1234,56
        v = v.replace(",", ".")
    return _q2(abs(Decimal(v)))


# --------------------------------------------------------------------------- #
# Carregadores de títulos
# --------------------------------------------------------------------------- #
def carregar_titulos(caminho: str) -> list[Titulo]:
    """CSV genérico: tipo;data_vencimento;valor;descricao;documento."""
    with open(caminho, encoding="utf-8-sig", newline="") as f:
        amostra = f.read(2048)
        f.seek(0)
        sep = ";" if amostra.count(";") >= amostra.count(",") else ","
        leitor = csv.DictReader(f, delimiter=sep)
        titulos = []
        for linha in leitor:
            linha = {(k or "").strip().lower(): (v or "").strip() for k, v in linha.items()}
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


def carregar_cr_xlsx(
    caminho: str,
    aba: str = "CR - Contas a Receber",
    apenas_pagos: bool = True,
) -> list[Titulo]:
    """Carrega recebíveis da aba CR do Fluxo de Caixa.

    Por padrão traz só os marcados como recebidos (PAGO? = S), que são os que
    devem ter um crédito correspondente no extrato.
    """
    titulos: list[Titulo] = []
    for reg in read_table(caminho, aba):
        bruto = reg.get("VALOR TOTAL")
        if bruto in (None, ""):
            continue
        try:
            valor = _parse_valor(bruto)
        except Exception:
            continue
        if valor == 0:
            continue
        pago = (reg.get("PAGO?") or "").strip().upper() == "S"
        if apenas_pagos and not pago:
            continue
        cliente = (reg.get("CLIENTE") or "").strip()
        titulos.append(
            Titulo(
                tipo="receber",
                vencimento=excel_serial_to_date(reg.get("VENCIMENTO")),
                valor=valor,
                descricao=cliente,
                documento=str(reg.get("NF") or "").strip(),
                cliente=cliente,
                data_recebimento=excel_serial_to_date(reg.get("DATA RECEBIMENTO")),
                pago=pago,
                forma_pgto=(reg.get("FORMA DE PGTO") or "").strip(),
                centro=(reg.get("CENTRO DE RECEITA") or "").strip(),
            )
        )
    return titulos


# --------------------------------------------------------------------------- #
# Conciliação
# --------------------------------------------------------------------------- #
def carregar_cp_xlsx(
    caminho: str,
    aba: str = "CP - Contas a Pagar",
    apenas_pagos: bool = True,
) -> list[Titulo]:
    """Carrega contas a pagar da aba CP do Fluxo de Caixa.

    Por padrão traz só os pagos (Pago? = S), que devem ter um débito correspondente.
    Usa DATA PGTO como data esperada do movimento e NOVO VENC como vencimento.
    """
    titulos: list[Titulo] = []
    for reg in read_table(caminho, aba):
        bruto = reg.get("VALOR")
        if bruto in (None, ""):
            continue
        try:
            valor = _parse_valor(bruto)
        except Exception:
            continue
        if valor == 0:
            continue
        pago = (reg.get("Pago?") or reg.get("PAGO?") or "").strip().upper() == "S"
        if apenas_pagos and not pago:
            continue
        fornecedor = (reg.get("FORNECEDOR") or "").strip()
        venc = excel_serial_to_date(reg.get("NOVO VENC")) or excel_serial_to_date(
            reg.get("VENC ORIGINAL")
        )
        titulos.append(
            Titulo(
                tipo="pagar",
                vencimento=venc,
                valor=valor,
                descricao=fornecedor,
                documento=(reg.get("CLASSIFICAÇÃO") or "").strip(),
                cliente=fornecedor,
                data_recebimento=excel_serial_to_date(reg.get("DATA PGTO")),
                pago=pago,
                forma_pgto=(reg.get("FORMA DE PGTO") or "").strip(),
                centro=(reg.get("CENTRO DE CUSTO") or "").strip(),
            )
        )
    return titulos


def carregar_xlsx(caminho: str, aba: str) -> list[Titulo]:
    """Seleciona o carregador certo pela aba (CP = pagar, CR = receber)."""
    nome = aba.strip().upper()
    if nome.startswith("CP"):
        return carregar_cp_xlsx(caminho, aba=aba)
    return carregar_cr_xlsx(caminho, aba=aba)


def conciliar(
    extratos: list[Extrato],
    titulos: list[Titulo],
    janela_dias: int = 3,
) -> ResultadoConciliacao:
    transacoes = [t for ext in extratos for t in ext.transacoes]
    if not transacoes:
        return ResultadoConciliacao(titulos_em_aberto=list(titulos))

    dmin = min(t.data for t in transacoes) - timedelta(days=janela_dias)
    dmax = max(t.data for t in transacoes) + timedelta(days=janela_dias)
    janela = timedelta(days=janela_dias)

    usadas: set[int] = set()
    resultado = ResultadoConciliacao()
    tem_receber = tem_pagar = False

    for titulo in titulos:
        tem_receber = tem_receber or titulo.tipo == "receber"
        tem_pagar = tem_pagar or titulo.tipo == "pagar"
        alvo = titulo.data_esperada
        if alvo is None or alvo < dmin or alvo > dmax:
            resultado.ignorados_fora_periodo += 1
            continue
        esperado_credito = titulo.tipo == "receber"
        melhor_idx = melhor_dias = None
        for idx, t in enumerate(transacoes):
            if idx in usadas or t.entrada != esperado_credito:
                continue
            if abs(t.valor) != titulo.valor:
                continue
            dias = abs((t.data - alvo).days)
            if timedelta(days=dias) > janela:
                continue
            if melhor_dias is None or dias < melhor_dias:
                melhor_dias, melhor_idx = dias, idx
        if melhor_idx is not None:
            usadas.add(melhor_idx)
            resultado.conciliados.append(
                Match(titulo, transacoes[melhor_idx], melhor_dias)
            )
        else:
            resultado.titulos_em_aberto.append(titulo)

    # Só reportamos movimentos sem título no(s) sinal(is) que estamos conciliando
    # e que NÃO sejam transferências internas (aplicação/resgate/Rende Fácil).
    def relevante(t: Transacao) -> bool:
        if categorizar(t.descricao) == "Transferências internas":
            return False
        return (t.entrada and tem_receber) or (t.saida and tem_pagar)

    resultado.extrato_sem_titulo = [
        t for i, t in enumerate(transacoes) if i not in usadas and relevante(t)
    ]
    return resultado


# --------------------------------------------------------------------------- #
# Relatório
# --------------------------------------------------------------------------- #
def _brl(v: Decimal) -> str:
    return "R$ " + f"{v:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")


def relatorio_texto(r: ResultadoConciliacao, limite: int = 15) -> str:
    considerados = len(r.conciliados) + len(r.titulos_em_aberto)
    pct = (len(r.conciliados) / considerados * 100) if considerados else 0
    val_conc = sum((m.titulo.valor for m in r.conciliados), Decimal("0"))
    val_aberto = sum((t.valor for t in r.titulos_em_aberto), Decimal("0"))
    val_sem = sum((abs(t.valor) for t in r.extrato_sem_titulo), Decimal("0"))

    # Adapta o vocabulário a pagar (débito) ou receber (crédito).
    amostra = (r.conciliados[0].titulo if r.conciliados
               else r.titulos_em_aberto[0] if r.titulos_em_aberto else None)
    pagar = amostra is not None and amostra.tipo == "pagar"
    realizado = "pagos" if pagar else "recebidos"
    contra = "débito" if pagar else "crédito"
    mov = "Débitos" if pagar else "Créditos"

    L = ["# Conciliação bancária", ""]
    L.append(f"- Conciliados: {len(r.conciliados)}/{considerados} ({pct:.0f}%) — {_brl(val_conc)}")
    L.append(f"- Títulos {realizado} sem {contra} no banco: {len(r.titulos_em_aberto)} — {_brl(val_aberto)}")
    L.append(f"- {mov} do banco sem título: {len(r.extrato_sem_titulo)} — {_brl(val_sem)}")
    if r.ignorados_fora_periodo:
        L.append(f"- (Ignorados, fora do período do extrato: {r.ignorados_fora_periodo})")
    L.append("")

    if r.titulos_em_aberto:
        L.append(f"## ⚠️ Títulos marcados {realizado}, mas sem {contra} correspondente")
        L.append("_Possível: caiu em lote (COBRANÇA), líquido de tarifa, ou fora do período do OFX._")
        for t in r.titulos_em_aberto[:limite]:
            d = t.data_esperada
            doc = (t.documento or t.cliente)[:30]
            L.append(f"- {doc} — {_brl(t.valor)} ({t.forma_pgto}) em {d}")
        if len(r.titulos_em_aberto) > limite:
            L.append(f"- … +{len(r.titulos_em_aberto) - limite} títulos")
        L.append("")

    if r.extrato_sem_titulo:
        L.append(f"## ⚠️ {mov} no banco sem título correspondente")
        L.append("_Possível: lote, transferência, estorno, ou movimento não lançado na planilha._")
        for t in sorted(r.extrato_sem_titulo, key=lambda x: -abs(x.valor))[:limite]:
            L.append(f"- {t.data} {_brl(abs(t.valor))} — {t.descricao[:50]}")
        if len(r.extrato_sem_titulo) > limite:
            L.append(f"- … +{len(r.extrato_sem_titulo) - limite} movimentos")
    return "\n".join(L)
