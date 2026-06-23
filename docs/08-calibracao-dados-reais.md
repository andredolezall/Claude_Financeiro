# 08 — Calibração com dados reais (jun/2026)

Registro do primeiro teste com dados reais: extrato OFX do **Banco do Brasil** e a
planilha **Fluxo de Caixa 2026**, aba **CR - Contas a Receber**.

## Formatos reais confirmados

### OFX (Banco do Brasil)
- OFX v1 SGML, `VERSION:102`, `CHARSET:1252` (latin-1) — parser lê sem ajuste.
- Conta 27413-5, 427 transações em 01–23/jun, saldo R$ 9.368,22.
- Tipos de crédito: `PIX - RECEBIDO`, `TED-CRÉDITO`, `COBRANÇA`, `TRANSFERÊNCIA RECEBIDA`,
  `BB RENDE FÁCIL` (aplicação/resgate automático — **não é receita**).

### Planilha CR - Contas a Receber
- 27 colunas; 1.694 lançamentos de 2026 (1.440 PAGO=S, 254 em aberto).
- Datas em **serial do Excel** (ex.: 46027 → conversão via `planilha.excel_serial_to_date`).
- Colunas usadas na conciliação: `NF`, `CLIENTE`, `FORMA DE PGTO`, `VENCIMENTO`,
  `VALOR TOTAL`, `PAGO?`, `DATA RECEBIMENTO`, `CENTRO DE RECEITA`.
- Formas de pgto: Boleto (maioria), Pix, Cartão de Crédito, Depósito Bancário.

## Resultado da conciliação (1:1 por valor + data)

| Métrica | Valor |
|---|---|
| Conciliados 1:1 | 63/233 (27%) — R$ 201k |
| Títulos sem crédito | 170 — R$ 627k |
| Créditos sem título | 47 — R$ 517k (após remover Rende Fácil) |

## Achados que definem os próximos passos

1. **Boletos liquidam em LOTE.** Créditos `COBRANÇA` / `COBRANÇA ADIANTAMENTO`
   (R$ 45k, 19k…) agregam dezenas de boletos individuais. Daí o casamento 1:1 ficar
   em 27% — o grosso dos recebíveis é boleto. **Solução: conciliação por agregação.**
   - **Ideal:** usar o **arquivo de retorno CNAB (cobrança)** do BB, que itemiza quais
     boletos compõem cada crédito — conciliação exata, sem adivinhação.
   - **Alternativa:** heurística de subconjunto (somar boletos do período que batem
     com o valor do lote) — aproximada, exige revisão.
2. **Rende Fácil é interno.** Aplicações/resgates automáticos não são receita; já são
   filtrados da conciliação e categorizados como "Transferências internas".
3. **Período deve casar.** OFX cobre 01–23/jun; a planilha tem recebimentos de maio
   que não aparecem neste extrato. Para fechamento mensal limpo, usar OFX e CR do
   mesmo intervalo.
4. **Tarifa de boleto.** Boletos podem entrar líquidos de tarifa — prever tolerância
   de centavos ou conciliar pelo valor líquido quando vier do CNAB.

## Contas a Pagar (aba CP) — calibrado

- 4.914 lançamentos; 3.404 pagos. Colunas: `FORNECEDOR`, `VALOR`, `NOVO VENC`,
  `DATA PGTO`, `FORMA DE PGTO`, `Pago?`, `CENTRO DE CUSTO`, `CLASSIFICAÇÃO`.
- Conciliação CP × débitos do OFX (junho): **229/606 (38%)** — R$ 581k casados.
- Mesmo padrão da CR: boletos pagos em lote e títulos de fim de maio fora do OFX de junho.
- `DATA PGTO` está sempre preenchida e bem distribuída (sem fallback) — sem problema de dado.

Uso: `--aba "CP - Contas a Pagar"`. O carregador é selecionado automaticamente pela aba.

## D8 — RESOLVIDA: relatório consultaCBR do BB

O BB exporta o relatório **consultaCBR** (.xls) com cada boleto: `Seu Número` (= NF da
planilha), `Situação`, `Data Situação`, `Valor` e `Valor Liquidação`. Boletos liquidados
no mesmo dia somam exatamente o crédito `COBRANÇA` do extrato.

**Validação (junho/2026):** a soma diária dos boletos bateu **ao centavo** com o crédito
COBRANÇA do OFX em **15 de 16 dias** (o único fora foi 23/06, último dia do extrato —
efeito de borda). Conciliação exata, sem heurística.

- Módulo: `financeiro/boletos.py` · Comando: `/conciliar-boletos` · CLI: `financeiro.cli boletos`.
- `.xls` requer `xlrd`; `.xlsx` lê sem dependência.
- `Seu Número` liga cada crédito à venda na planilha CR (próximo passo: marcar o título
  CR como conciliado via o boleto, fechando a conciliação ponta a ponta).

### Separação de juros/multa × desconto × nominal
O relatório não tem coluna de juros, mas a diferença `Valor Liquidação − Valor` (nominal)
revela o ajuste: positivo = **juros/multa** (receita financeira), negativo = **desconto**.
`/conciliar-boletos` separa e totaliza isso (nominal + juros − desconto = liquidado) e
lista cada boleto ajustado. No xls de exemplo: 8 com juros (R$ 1.655,91) e 1 desconto
(R$ 172,00). Útil para a DRE (segrega receita de venda de receita financeira).

### Conciliação por NF para preencher a CR (preenchimento.py)
A unidade de conciliação é a **NF**: soma todas as linhas da CR (PVs) e todos os boletos
da NF, e bate as somas. Resolve os dois casos reais — vários PVs → 1 boleto, e 1 NF em
parcelas → vários boletos. Validação real: **314/332 NFs** com soma batendo.

- Chave de casamento: **NF + valor nominal**. Vencimento entra só como **desempate (FIFO)**,
  pois diverge entre boleto e CR em ~50% (CR guarda o original; boleto o efetivo/renegociado).
- Só preenche linha com `PAGO?` em branco (não sobrescreve trabalho manual).
- NFs cuja soma não fecha → status **divergente** (revisar: parcela faltando, centavos,
  renegociação). Caso de boletos idênticos (mesmo valor e data) → **ambíguo**, revisão manual.
- Comando `/preencher-cr` · CLI `financeiro.cli preencher` (gera CSV opcional).

### Recomendações operacionais
- Use OFX e consultaCBR do **mesmo período** (mês fechado) para conciliação limpa.
- Boletos liquidados via PIX caem como crédito PIX avulso (tratados em bucket separado).
