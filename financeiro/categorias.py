"""Categorização de movimentos bancários por palavras-chave.

Regras simples e auditáveis (microprocesso FIN-CAP-004 / FIN-TES). As regras
são editáveis aqui ou via arquivo JSON externo. A primeira regra que casa vence;
ordem importa (do mais específico para o mais genérico).
"""

from __future__ import annotations

import json
import re

# (categoria, lista de padrões regex em minúsculo)
REGRAS_PADRAO: list[tuple[str, list[str]]] = [
    ("Impostos e tributos", [r"\bdarf\b", r"\bdas\b", r"\bgare\b", r"\bgps\b",
                             r"pis", r"cofins", r"icms", r"\bipi\b", r"\biss\b",
                             r"irpj", r"csll", r"\bfgts\b", r"\binss\b", r"imposto"]),
    ("Folha e pessoal", [r"folha", r"sal[aá]rio", r"adiantamento sal", r"pr[oó]-?labore",
                         r"rescis[aã]o", r"f[eé]rias", r"13[º°]?", r"vale.?transporte",
                         r"vale.?refei", r"benef[ií]cio"]),
    ("Tarifas bancárias", [r"tarifa", r"\bior?f\b", r"\bced\b", r"manuten[çc][aã]o de conta",
                           r"pacote de servi", r"taxa", r"juros", r"\bted\b\s*tarifa"]),
    ("Transferências internas", [r"transfer[eê]ncia entre contas", r"aplica[çc][aã]o",
                                 r"resgate", r"investimento", r"rende f[aá]cil",
                                 r"\bcdb\b", r"poupan[çc]a", r"fundo de invest"]),
    ("Pagamento a fornecedores", [r"fornecedor", r"pagamento.*fornec", r"pagto", r"\bcompra\b",
                                  r"boleto pago", r"pix enviado"]),
    ("Recebimento de clientes", [r"recebimento", r"liquida[çc][aã]o", r"cr[eé]dito.*cliente",
                                 r"boleto recebido", r"pix recebido", r"dep[oó]sito", r"cliente"]),
]


def carregar_regras(caminho: str | None = None) -> list[tuple[str, list[str]]]:
    if not caminho:
        return REGRAS_PADRAO
    with open(caminho, encoding="utf-8") as f:
        dados = json.load(f)
    return [(item["categoria"], item["padroes"]) for item in dados]


def categorizar(descricao: str, regras: list[tuple[str, list[str]]] | None = None) -> str:
    regras = regras or REGRAS_PADRAO
    texto = (descricao or "").lower()
    for categoria, padroes in regras:
        for padrao in padroes:
            if re.search(padrao, texto):
                return categoria
    return "Não classificado"
