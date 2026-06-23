"""Testes do toolkit financeiro. Rodar: python -m pytest (ou python tests/test_financeiro.py)."""

import os
import sys
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from financeiro import conciliacao, fluxo_caixa  # noqa: E402
from financeiro.categorias import categorizar  # noqa: E402
from financeiro.ofx import parse_ofx  # noqa: E402

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OFX = os.path.join(BASE, "data", "exemplos", "extrato-exemplo.ofx")
CSV = os.path.join(BASE, "data", "exemplos", "titulos-exemplo.csv")


def test_parse_ofx():
    ext = parse_ofx(OFX)
    assert ext.moeda == "BRL"
    assert ext.banco_id == "341"
    assert len(ext.transacoes) == 6
    assert ext.saldo == Decimal("48104.50")
    assert ext.total_entradas == Decimal("20300.00")
    assert ext.total_saidas == Decimal("-26195.50")
    assert ext.movimento_liquido == Decimal("-5895.50")


def test_categorizacao():
    assert categorizar("DARF PIS COFINS") == "Impostos e tributos"
    assert categorizar("Folha pagamento salarios junho") == "Folha e pessoal"
    assert categorizar("Tarifa pacote de servicos") == "Tarifas bancárias"
    assert categorizar("Recebimento NF 1023 Cliente ABC") == "Recebimento de clientes"
    assert categorizar("Pagamento fornecedor XYZ NF 558") == "Pagamento a fornecedores"


def test_fluxo():
    resumo = fluxo_caixa.resumir([parse_ofx(OFX)])
    assert resumo.qtd_transacoes == 6
    assert resumo.movimento_liquido == Decimal("-5895.50")
    assert resumo.por_categoria["Impostos e tributos"] == Decimal("-845.00")
    assert resumo.por_categoria["Folha e pessoal"] == Decimal("-22000.00")
    assert resumo.por_categoria["Pagamento a fornecedores"] == Decimal("-3200.50")
    assert resumo.por_categoria["Recebimento de clientes"] == Decimal("20300.00")


def test_conciliacao():
    titulos = conciliacao.carregar_titulos(CSV)
    assert len(titulos) == 5
    r = conciliacao.conciliar([parse_ofx(OFX)], titulos, janela_dias=3)
    # 4 títulos casam (incl. NF 1024 que venceu 16 e caiu 15); NF 1025 fica em aberto.
    assert len(r.conciliados) == 4
    docs_abertos = {t.documento for t in r.titulos_em_aberto}
    assert docs_abertos == {"1025"}
    # DARF e Tarifa são movimentos legítimos sem título correspondente.
    sem_titulo = {t.id_fit for t in r.extrato_sem_titulo}
    assert sem_titulo == {"0003", "0004"}


def _run_all():
    falhas = 0
    for nome, fn in sorted(globals().items()):
        if nome.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"  ok  {nome}")
            except AssertionError as e:
                falhas += 1
                print(f" FAIL {nome}: {e}")
    if falhas:
        print(f"\n{falhas} teste(s) falharam.")
        sys.exit(1)
    print("\nTodos os testes passaram.")


if __name__ == "__main__":
    _run_all()
