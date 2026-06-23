"""Parser de OFX (extratos bancários).

Suporta OFX v1 (SGML, formato mais comum nos bancos brasileiros) e v2 (XML).
Tolerante a tags não fechadas e a acentuação latin-1/utf-8. Sem dependências
externas — usa apenas a biblioteca padrão.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal, InvalidOperation


@dataclass
class Transacao:
    data: date
    valor: Decimal          # positivo = crédito (entrada), negativo = débito (saída)
    tipo: str               # TRNTYPE do OFX (CREDIT, DEBIT, etc.)
    descricao: str
    id_fit: str             # FITID — identificador único da transação no banco

    @property
    def entrada(self) -> bool:
        return self.valor > 0

    @property
    def saida(self) -> bool:
        return self.valor < 0


@dataclass
class Extrato:
    banco_id: str | None
    conta_id: str | None
    tipo_conta: str | None
    moeda: str | None
    saldo: Decimal | None
    saldo_data: date | None
    transacoes: list[Transacao] = field(default_factory=list)

    @property
    def total_entradas(self) -> Decimal:
        return sum((t.valor for t in self.transacoes if t.entrada), Decimal("0"))

    @property
    def total_saidas(self) -> Decimal:
        return sum((t.valor for t in self.transacoes if t.saida), Decimal("0"))

    @property
    def movimento_liquido(self) -> Decimal:
        return self.total_entradas + self.total_saidas


def _decode(raw: bytes) -> str:
    for enc in ("utf-8", "latin-1"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def _parse_data(valor: str | None) -> date | None:
    if not valor:
        return None
    m = re.match(r"\s*(\d{4})(\d{2})(\d{2})", valor)
    if not m:
        return None
    return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))


def _parse_decimal(valor: str | None) -> Decimal | None:
    if valor is None:
        return None
    v = valor.strip().replace(",", ".")
    try:
        return Decimal(v)
    except (InvalidOperation, ValueError):
        return None


def _campo(bloco: str, tag: str) -> str | None:
    """Extrai o valor de <TAG>valor — funciona com tags fechadas ou não (SGML)."""
    m = re.search(rf"<{tag}>([^<\r\n]*)", bloco, re.IGNORECASE)
    return m.group(1).strip() if m else None


def parse_ofx(caminho: str) -> Extrato:
    with open(caminho, "rb") as f:
        texto = _decode(f.read())

    inicio = texto.upper().find("<OFX>")
    corpo = texto[inicio:] if inicio != -1 else texto

    banco_id = _campo(corpo, "BANKID")
    conta_id = _campo(corpo, "ACCTID")
    tipo_conta = _campo(corpo, "ACCTTYPE")
    moeda = _campo(corpo, "CURDEF")
    saldo = _parse_decimal(_campo(corpo, "BALAMT"))
    saldo_data = _parse_data(_campo(corpo, "DTASOF"))

    transacoes: list[Transacao] = []
    # Cada <STMTTRN> inicia uma transação; corta no fechamento ou na próxima.
    for pedaco in re.split(r"<STMTTRN>", corpo, flags=re.IGNORECASE)[1:]:
        fim = re.search(r"</STMTTRN>", pedaco, re.IGNORECASE)
        bloco = pedaco[: fim.start()] if fim else pedaco
        valor = _parse_decimal(_campo(bloco, "TRNAMT"))
        data_t = _parse_data(_campo(bloco, "DTPOSTED"))
        if valor is None or data_t is None:
            continue
        descricao = _campo(bloco, "MEMO") or _campo(bloco, "NAME") or ""
        transacoes.append(
            Transacao(
                data=data_t,
                valor=valor,
                tipo=(_campo(bloco, "TRNTYPE") or "").upper(),
                descricao=descricao.strip(),
                id_fit=_campo(bloco, "FITID") or "",
            )
        )

    transacoes.sort(key=lambda t: t.data)
    return Extrato(
        banco_id=banco_id,
        conta_id=conta_id,
        tipo_conta=tipo_conta,
        moeda=moeda,
        saldo=saldo,
        saldo_data=saldo_data,
        transacoes=transacoes,
    )
