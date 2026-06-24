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
    # 4 títulos casam (incl. NF 1024 que venceu 16 e caiu 15).
    assert len(r.conciliados) == 4
    # NF 1025 vence 25/06, fora do período do extrato (termina 20/06 +3) → ignorada.
    assert r.ignorados_fora_periodo == 1
    assert r.titulos_em_aberto == []
    # DARF e Tarifa são débitos legítimos sem título correspondente.
    sem_titulo = {t.id_fit for t in r.extrato_sem_titulo}
    assert sem_titulo == {"0003", "0004"}


def test_boletos_lotes():
    from datetime import date as _date
    from financeiro import boletos as B
    from financeiro.ofx import Extrato, Transacao

    def boleto(seu, valor, tipo="Via Compe", d=_date(2026, 6, 1)):
        return B.Boleto("Cliente", "00.000.000/0001-00", seu, "NN", _date(2026, 5, 20),
                        "Liquidado", d, Decimal(valor), Decimal(valor), tipo)

    def boleto_juros(seu, nominal, liquidado, d=_date(2026, 6, 1)):
        return B.Boleto("Cliente", "00.000.000/0001-00", seu, "NN", _date(2026, 5, 20),
                        "Liquidado", d, Decimal(nominal), Decimal(liquidado), "Via Compe")

    # boleto 1 nominal 100; boleto 2 nominal 250 liquidado 270 (juros 20) → COBRANÇA = 370
    bs = [boleto("1", "100.00"), boleto_juros("2", "250.00", "270.00"),
          boleto("3", "30.00", "PIX")]
    ext = Extrato("001", "1-1", "CHECKING", "BRL", None, None, [
        Transacao(_date(2026, 6, 1), Decimal("370.00"), "CREDIT", "COBRANCA", "c1"),
        Transacao(_date(2026, 6, 1), Decimal("30.00"), "CREDIT", "PIX - RECEBIDO", "c2"),
    ])
    res = B.conciliar(bs, [ext])
    assert len(res.lotes_conciliados) == 2
    assert res.lotes_pendentes == []
    cobr = [l for l, _ in res.lotes_conciliados if l.tipo == "COBRANÇA"][0]
    assert len(cobr.boletos) == 2 and cobr.valor == Decimal("370.00")
    # separação nominal × juros
    assert cobr.valor_nominal == Decimal("350.00")
    assert cobr.juros_multa == Decimal("20.00")
    assert cobr.desconto == Decimal("0")


def test_conciliacao_por_nf():
    from datetime import date as D
    from financeiro import preenchimento as P
    from financeiro.boletos import Boleto
    from financeiro.conciliacao import Titulo

    def cr(nf, val, venc, pago=False):
        return Titulo("receber", venc, Decimal(val), "Cli", nf, cliente="Cli", pago=pago)

    def bol(nf, val, d):
        return Boleto("Cli", "cnpj", nf, "NN", None, "Liquidado", d,
                      Decimal(val), Decimal(val), "Via Compe")

    # caso do usuário: 2 PVs na CR -> 1 boleto pela NF inteira
    r = P.conciliar_por_nf(
        [cr("108000", "250.00", D(2026, 6, 10)), cr("108000", "750.00", D(2026, 6, 10))],
        [bol("108000", "1000.00", D(2026, 6, 12))],
    )
    assert r.nfs[0].status == "conciliado"
    assert len(r.a_preencher) == 2
    assert all(l.preencher and l.data_recebimento == D(2026, 6, 12) for l in r.a_preencher)

    # já pago não é sobrescrito
    r2 = P.conciliar_por_nf([cr("200", "100.00", D(2026, 6, 1), pago=True)],
                            [bol("200", "100.00", D(2026, 6, 2))])
    assert r2.a_preencher == []

    # soma diverge -> divergente, não preenche
    r3 = P.conciliar_por_nf([cr("300", "100.00", D(2026, 6, 1))],
                            [bol("300", "90.00", D(2026, 6, 2))])
    assert r3.nfs[0].status == "divergente" and r3.a_preencher == []


def test_baixa_cp():
    from datetime import date as D
    from financeiro import baixa_cp as B
    from financeiro.conciliacao import Titulo
    from financeiro.ofx import Extrato, Transacao

    def cp(forn, val, venc, dpgto, forma):
        return Titulo("pagar", venc, Decimal(val), forn, "Classe", cliente=forn,
                      data_recebimento=dpgto, pago=True, forma_pgto=forma)

    titulos = [
        cp("Fornecedor A", "150.00", D(2026, 6, 10), D(2026, 6, 12), "Boleto"),   # único -> SUGERIDO
        cp("Loja X", "99.00", D(2026, 6, 5), D(2026, 6, 5), "Cartão de Crédito"), # cartão -> CONFERIR
        cp("Fornecedor B", "200.00", D(2026, 6, 1), D(2026, 6, 1), "Pix"),        # sem débito -> CONFERIR
    ]
    ext = Extrato("001", "1-1", "CHECKING", "BRL", None, None, [
        Transacao(D(2026, 6, 12), Decimal("-150.00"), "DEBIT", "PAG FORNECEDOR A", "d1"),
        Transacao(D(2026, 6, 3), Decimal("-500.00"), "DEBIT", "OUTRO", "d2"),
    ])
    res = B.sugerir_baixa_cp(titulos, [ext])
    assert len(res.sugeridos) == 1
    assert res.sugeridos[0].fornecedor == "Fornecedor A"
    assert res.sugeridos[0].data_pgto == D(2026, 6, 12)
    assert len(res.conferir) == 2


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
