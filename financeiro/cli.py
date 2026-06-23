"""Interface de linha de comando do toolkit financeiro.

Uso:
    python -m financeiro.cli fluxo   EXTRATO.ofx [EXTRATO2.ofx ...]
    python -m financeiro.cli conciliar  --titulos titulos.csv  EXTRATO.ofx [...]

É a camada que os comandos do Claude Code (/fluxo-caixa, /conciliar) chamam.
"""

from __future__ import annotations

import argparse
import sys

from . import boletos as mod_boletos
from . import conciliacao, fluxo_caixa, preenchimento
from .ofx import parse_ofx


def _cmd_fluxo(args: argparse.Namespace) -> int:
    extratos = [parse_ofx(c) for c in args.extratos]
    resumo = fluxo_caixa.resumir(extratos)
    print(fluxo_caixa.relatorio_texto(resumo))
    return 0


def _cmd_conciliar(args: argparse.Namespace) -> int:
    extratos = [parse_ofx(c) for c in args.extratos]
    if args.titulos.lower().endswith(".xlsx"):
        titulos = conciliacao.carregar_xlsx(args.titulos, aba=args.aba)
    else:
        titulos = conciliacao.carregar_titulos(args.titulos)
    resultado = conciliacao.conciliar(extratos, titulos, janela_dias=args.janela)
    print(conciliacao.relatorio_texto(resultado))
    return 0


def _cmd_boletos(args: argparse.Namespace) -> int:
    boletos = mod_boletos.carregar_boletos(args.boletos)
    extratos = [parse_ofx(c) for c in args.extratos]
    resultado = mod_boletos.conciliar(boletos, extratos, janela_dias=args.janela)
    print(mod_boletos.relatorio_texto(resultado))
    return 0


def _cmd_preencher(args: argparse.Namespace) -> int:
    resumo = preenchimento.carregar_e_conciliar(args.planilha, args.boletos, aba=args.aba)
    print(preenchimento.relatorio_texto(resumo))
    if args.saida:
        n = preenchimento.escrever_csv_preenchimento(resumo, args.saida)
        print(f"\n{n} linha(s) gravada(s) em {args.saida}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="financeiro", description="Toolkit financeiro")
    sub = parser.add_subparsers(dest="comando", required=True)

    p_fluxo = sub.add_parser("fluxo", help="Posição de caixa e fluxo a partir de OFX")
    p_fluxo.add_argument("extratos", nargs="+", help="Arquivos .ofx")
    p_fluxo.set_defaults(func=_cmd_fluxo)

    p_conc = sub.add_parser("conciliar", help="Concilia extrato OFX com títulos CSV")
    p_conc.add_argument("extratos", nargs="+", help="Arquivos .ofx")
    p_conc.add_argument("--titulos", required=True, help="Títulos: CSV genérico ou planilha .xlsx")
    p_conc.add_argument("--aba", default="CR - Contas a Receber", help="Aba do .xlsx (default CR)")
    p_conc.add_argument("--janela", type=int, default=3, help="Janela de dias para casar (default 3)")
    p_conc.set_defaults(func=_cmd_conciliar)

    p_bol = sub.add_parser("boletos", help="Concilia lotes de boleto (relatório consultaCBR) com o OFX")
    p_bol.add_argument("extratos", nargs="+", help="Arquivos .ofx")
    p_bol.add_argument("--boletos", required=True, help="Relatório de cobrança do BB (.xls/.xlsx)")
    p_bol.add_argument("--janela", type=int, default=1, help="Janela de dias para casar (default 1)")
    p_bol.set_defaults(func=_cmd_boletos)

    p_pre = sub.add_parser("preencher", help="Concilia CR × boletos por NF e gera a tabela de preenchimento")
    p_pre.add_argument("--planilha", required=True, help="Planilha de Fluxo de Caixa (.xlsx)")
    p_pre.add_argument("--boletos", required=True, help="Relatório consultaCBR do BB (.xls/.xlsx)")
    p_pre.add_argument("--aba", default="CR - Contas a Receber", help="Aba da CR")
    p_pre.add_argument("--saida", help="CSV com as linhas a preencher (opcional)")
    p_pre.set_defaults(func=_cmd_preencher)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
