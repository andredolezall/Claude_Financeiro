"""Leitor de planilhas .xlsx usando apenas a biblioteca padrão.

Suficiente para ler abas de dados tabulares (cabeçalho na 1ª linha) sem depender
de openpyxl/pandas. Datas no Excel são números seriais — converta com
`excel_serial_to_date` nas colunas de data, pela posição/nome.
"""

from __future__ import annotations

import zipfile
from datetime import date, datetime, timedelta
from xml.etree import ElementTree as ET

_NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
_RNS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"


def excel_serial_to_date(valor) -> date | None:
    """Converte serial do Excel (sistema 1900) para date. Ignora não-numéricos."""
    if valor in (None, ""):
        return None
    try:
        f = float(valor)
    except (TypeError, ValueError):
        return None
    # Excel conta a partir de 1899-12-30 (compensa o bug do ano 1900).
    return (datetime(1899, 12, 30) + timedelta(days=f)).date()


def _col_letters(ref: str) -> str:
    return "".join(c for c in ref if c.isalpha())


def _col_index(letters: str) -> int:
    n = 0
    for c in letters:
        n = n * 26 + (ord(c.upper()) - 64)
    return n


def _sheet_path(z: zipfile.ZipFile, nome: str) -> str:
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    rid_to_target = {r.get("Id"): r.get("Target") for r in rels}
    for s in wb.iter(_NS + "sheet"):
        if s.get("name") == nome:
            target = rid_to_target[s.get(_RNS + "id")]
            return target if target.startswith("xl/") else "xl/" + target
    disponiveis = [s.get("name") for s in wb.iter(_NS + "sheet")]
    raise KeyError(f"Aba {nome!r} não encontrada. Disponíveis: {disponiveis}")


def listar_abas(caminho: str) -> list[str]:
    z = zipfile.ZipFile(caminho)
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    return [s.get("name") for s in wb.iter(_NS + "sheet")]


def _ler_linhas(caminho: str, aba: str) -> list[dict[int, str]]:
    z = zipfile.ZipFile(caminho)
    sst: list[str] = []
    try:
        root = ET.fromstring(z.read("xl/sharedStrings.xml"))
        for si in root:
            sst.append("".join(t.text or "" for t in si.iter(_NS + "t")))
    except KeyError:
        pass

    ws = ET.fromstring(z.read(_sheet_path(z, aba)))
    data = ws.find(_NS + "sheetData")
    linhas: list[dict[int, str]] = []
    for r in data.findall(_NS + "row"):
        cells: dict[int, str] = {}
        for c in r.findall(_NS + "c"):
            ref = c.get("r")
            if not ref:
                continue
            t = c.get("t")
            v = c.find(_NS + "v")
            isn = c.find(_NS + "is")
            if t == "s" and v is not None:
                val = sst[int(v.text)]
            elif t == "inlineStr" and isn is not None:
                val = "".join(x.text or "" for x in isn.iter(_NS + "t"))
            elif v is not None:
                val = v.text
            else:
                val = None
            cells[_col_index(_col_letters(ref))] = val
        linhas.append(cells)
    return linhas


def read_table(caminho: str, aba: str) -> list[dict[str, str]]:
    """Lê uma aba como lista de dicionários, usando a 1ª linha como cabeçalho."""
    linhas = _ler_linhas(caminho, aba)
    if not linhas:
        return []
    header = linhas[0]
    max_col = max((max(c) for c in linhas if c), default=0)
    nomes = {i: (header.get(i) or "").strip() for i in range(1, max_col + 1)}
    registros = []
    for cells in linhas[1:]:
        registros.append({nome: cells.get(i) for i, nome in nomes.items() if nome})
    return registros
