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

## Decisão em aberto (D8)
Como tratar os lotes de boleto: **CNAB retorno** (exato) vs. **heurística de soma**?
Depende de você conseguir extrair o arquivo de retorno da cobrança no BB.
