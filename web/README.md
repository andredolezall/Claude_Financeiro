# Conciliador web (HTML client-side)

Front-end da conciliação **Contas a Receber × Boletos**, para dar o start no processo
sem depender de chat. Roda **100% no navegador** — nenhum arquivo é enviado a servidor.

## Arquivos
- `index.html` — interface (upload + tabela + download do CSV).
- `engine.js` — o motor de conciliação por NF, **portado de `financeiro/preenchimento.py`**
  e validado contra ele nos dados reais (resultados idênticos: 314/18/813/1).

## Como usar
1. Abra `index.html` no navegador (duplo clique). Precisa de internet só para carregar a
   biblioteca SheetJS via CDN — os **dados não saem** da máquina.
2. Suba o **relatório de boletos** (consultaCBR, `.xls`/`.xlsx`) e a **planilha** (`.xlsx`).
3. Clique **Conciliar**: aparece o resumo e a tabela (DECIDIR primeiro, depois PREENCHER).
4. **Baixar CSV** gera o arquivo `PREENCHER + DECIDIR` (mesmo formato do `/preencher-cr`).

## Lógica (idêntica ao Python)
- Unidade = NF: soma as linhas da CR e os boletos da NF e bate as somas.
- Chave NF + valor nominal; FIFO por vencimento; só marca linha em branco.
- `DATA RECEBIMENTO` = data de liquidação do boleto (decisão D9).
- Soma divergente ou boletos idênticos → DECIDIR (não preenche).

## Próximo passo (escrita na planilha)
O CSV baixado é a entrada para o **Office Script** (Power Automate), que grava `PAGO?` e
`DATA RECEBIMENTO` na CR do OneDrive **preservando pivôs/DRE**. Ver `docs/09-office-script.md`
(a construir).

## Para validar o motor offline (Node)
```
npm install xlsx
node -e "see scripts de validação"   # reconcileCR(cr, boletos) deve bater com o Python
```
