# 09 — Office Script: gravar a conciliação na CR (OneDrive)

Fecha o ciclo: o Conciliador (web/) gera o CSV; o **Office Script `PreencherCR`** grava
`PAGO?` e `DATA RECEBIMENTO` na aba **CR - Contas a Receber**, **preservando pivôs/DRE**
(escreve só as células de PAGO?/DATA das linhas casadas e em branco).

Arquivo do script: `office-script/PreencherCR.ts`.

---

## ⭐ Recomendado p/ arquivo SÓ ONLINE: `ConciliarCR`

Se a planilha fica **só no OneDrive/SharePoint** (você não baixa o arquivo), use o script
**`ConciliarCR`** (`office-script/ConciliarCR.ts`): ele faz a **conciliação inteira dentro
do Excel** — lê a CR ao vivo + a aba `Boletos` e preenche tudo. Você só lida com o
relatório de boletos; a planilha nunca sai da nuvem. **Não precisa de Azure.**

**Fluxo diário (sem baixar a planilha):**
1. Abra **`web/online.html`**, suba o `consultaCBR`, clique **Copiar boletos p/ Excel**.
2. No Excel da web: aba **`Boletos`** → célula **A1** → **colar** (Ctrl+V).
3. **Automatizar → ConciliarCR**. A CR é preenchida; divergências vão p/ `Conciliação Revisar`.

**Instalação (uma vez):**
1. Faça uma **cópia** da planilha para testar.
2. Crie uma aba vazia chamada **`Boletos`**.
3. **Automatizar → Novo Script** → cole todo o `office-script/ConciliarCR.ts` → salve
   como `ConciliarCR`.

Mesma lógica validada do motor (casa por soma da NF, FIFO por vencimento, nunca sobrescreve
`S`) — testada no Node contra `engine.js`: resultado idêntico (13/1/1137 NFs, 9 preenchidos).

> O `PreencherCR` abaixo é a **alternativa** quando você prefere conciliar no app web e
> colar o CSV já decidido (exige ter a CR no app, ou seja, baixar a planilha).

---

## Pré-requisitos
- Excel na web (Microsoft 365) com o menu **Automatizar** visível.
- A planilha no OneDrive com a aba `CR - Contas a Receber` (colunas NF, VALOR TOTAL,
  PAGO?, DATA RECEBIMENTO, VENCIMENTO).
- ⚠️ As colunas **PAGO?** e **DATA RECEBIMENTO** devem ser de **digitação** (não fórmula)
  — o script grava valores nelas.

## Instalação (uma vez)
1. **Faça uma cópia da planilha** para testar (segurança).
2. Crie uma aba chamada **`Conciliação Entrada`** (vazia).
3. Excel na web → **Automatizar** → **Novo Script** → apague o exemplo e **cole** todo o
   conteúdo de `office-script/PreencherCR.ts` → **Salvar** com o nome `PreencherCR`.

## Teste manual (hoje, sem Power Automate)
1. Abra o **Conciliador.html**, suba o `consultaCBR` + a planilha, clique **Conciliar**,
   **Baixar CSV**.
2. Na planilha (cópia), aba **`Conciliação Entrada`**: importe o CSV
   (**Dados → De Texto/CSV**, separador `;`) ou cole e use **Texto para Colunas** (`;`).
   A 1ª linha tem que ser o cabeçalho `AÇÃO;STATUS;NF;...`.
3. **Automatizar → PreencherCR → Executar.**
4. Confira: a **CR** preenchida (PAGO?/DATA) nas linhas casadas; os itens **DECIDIR**
   copiados para a aba **`Conciliação Revisar`**; o resumo aparece no rodapé do script.

O script casa por **NF + VALOR NOMINAL**, escolhe a linha em branco de **vencimento mais
antigo** (FIFO) e **nunca** sobrescreve uma linha já marcada `S`.

## Automação (depois, Power Automate)
Fluxo agendado/por gatilho:
1. **Gatilho:** agendado (ex.: diário) ou "quando um arquivo é criado" numa pasta do
   OneDrive onde você larga o CSV do Conciliador.
2. **Ação Excel — “Executar script”:** antes, popular a aba `Conciliação Entrada` com as
   linhas do CSV (ação *Listar linhas* da fonte + *Adicionar linha*), ou usar uma versão
   do script que recebe as linhas por parâmetro.
3. **Executar `PreencherCR`.** O retorno (resumo) pode ser enviado a você por e-mail/Teams.

## Limites conhecidos
- Só preenche o que o Conciliador marcou `PREENCHER`; `DECIDIR` fica para você.
- Linhas `PREENCHER` sem correspondência em branco na CR entram no resumo como
  "não encontradas" (ex.: já preenchidas, ou valor/vencimento divergente).
