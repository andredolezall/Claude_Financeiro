# 05 — Pendências e itens "NÃO COMPROVADO — validar"

> Regra Inviolável nº 1 (zero suposição): tudo que não pôde ser comprovado nesta rodada
> está listado aqui como hipótese a validar, com o responsável. Data: 2026-06-29.

## A. Dependências que só o Andre (dono) destrava

| # | Item | Por que importa | Status |
|---|---|---|---|
| A1 | **Acesso/export do projeto Lovable** do site `dgrgestao.com.br` | O ambiente bloqueou o acesso ao site (egresso). Sem o export não dá para portar a identidade visual nem confirmar a stack. | ⏳ aberto |
| A2 | **Conta Meta Developer + número WhatsApp Business verificado** | Sem isso o pipeline real de WhatsApp não pluga (hoje há mock/sender de teste). | ⏳ aberto |
| A3 | **Chave ANTHROPIC_API_KEY** | Sem ela a plataforma roda em modo mock determinístico. Para extração/consultoria reais, configurar `.env`. | ⏳ aberto |
| A4 | **Atualizar banner e materiais para "PMEs"** | Hoje dizem "microempreendedores"; o DG e a Constituição já assumem PMEs até R$ 10M/ano. Desalinhamento institucional. | ⏳ aberto |
| A5 | **Templates HSM aprovados pela Meta** (cobrança, lembrete, alerta de caixa) | Notificações fora da janela de 24h exigem template aprovado. | ⏳ aberto |
| A6 | **Base de conhecimento real** (casos/medidas da DGR) | A pesquisa 3.3 montou a estrutura; a curadoria final do conteúdo proprietário é da DGR. | ⏳ aberto |

## B. Números de mercado a revalidar (da pesquisa Fase 0)

Resumo de `docs/pesquisa/02_modelos_consultoria_pme.md`:

| Afirmação do plano | Veredito da pesquisa | Ação |
|---|---|---|
| "21 milhões de PMEs" | **Não confirma** (SEBRAE ≈ 24 mi ativos, inclui MEI) | Corrigir antes de usar em landing page |
| "72% usam WhatsApp" | **Confirma** (CNDL/SPC 67%; RD Station ~70%) | Pode usar com fonte |
| "8% têm automação" | **Plausível** (só ~20% usam app) | Marcar como estimativa |
| "TAM R$ 18 bi/ano" | **NÃO COMPROVADO** (proxy BPO financeiro ≈ R$ 26,8 bi/2024) | Recalcular com CEMPRE/Receita |
| SAM/SOM absolutos | **NÃO COMPROVADO** (exigem microdados) | Validar com fonte primária |

## C. Metas de unit economics — sinalizadas como agressivas

Da pesquisa (benchmark B2B/SaaS Brasil): **3 das 8 metas estão fora do benchmark** e devem
ser tratadas como ambição, não baseline:

- **CAC ≤ R$ 400** — agressivo para venda consultiva B2B.
- **CAC payback ≤ 3 meses** — agressivo; B2B costuma ficar acima.
- **NPS ≥ 70** — agressivo como meta de entrada.
- Realistas: LTV/CAC ≥ 4, margem ≥ 70%, NRR ≥ 105%, TTV ≤ 7 dias.
- **Definir**: churn ≤ 5% é mensal ou anual? Muda completamente a leitura.

## D0. Premissas da viabilização de oportunidade (calibrar com o dono)

O brief de viabilização projeta **lucro/prejuízo** a partir de duas premissas por tenant —
hoje com defaults marcados `estimado` (Regra nº 1). Precisam ser calibradas com o empresário:

| Premissa | Campo | Default atual | Ação |
|---|---|---|---|
| Custo variável (% do faturamento) | `Tenant.custoVariavelPct` | 0,60 (demo: 0,55) | Levantar o custo variável real por tenant/setor |
| Capacidade mensal de entrega (R$) | `Tenant.capacidadeMensalInformadaR$` | estimada pela média de receita | Pedir a capacidade real ao dono; a estimativa é só ponto de partida |
| Fator de custo da terceirização | `FATOR_TERCEIRIZACAO` (viabilizacao.ts) | 0,35 | Validar com cotação real de parceiros do setor |
| Refinamento da recomendação | — | hoje favorece margem (opção B) | Incluir urgência/prazo do cliente para às vezes recomendar A |

## D. Decisões de produto a validar contra margem/COGS

- A **matriz de planos × recursos** (§7.1, implementada) é hipótese: validar que cada recurso
  cabe na margem ≥ 70% do plano. Em especial, custo de áudio (transcrição) e de consultoria
  (`dg_consultor: full/priority`).
- **Limiar N≥X** do aprendizado anonimizado (`DGR_LEARNING_MIN_TENANTS`, default 5): valor de
  X a calibrar com volume real de clientes (a pesquisa 04 deixou X em aberto).
- **Retenção de dados enterprise da xAI** e base de "legítimo interesse": marcados
  NÃO COMPROVADO em `04_governanca_dados_retroalimentacao.md` — revalidar antes de uso jurídico.

## E. Notas técnicas das pesquisas

- Vários sites oficiais retornaram **HTTP 403 (anti-bot/proxy)** ao fetch direto; os dados
  foram extraídos via busca indexada das mesmas páginas oficiais. **Revalidar cada citação
  no navegador** antes de uso comercial/jurídico (preços de concorrentes, políticas de IA).
- O **store em memória** é referência de MVP; produção exige Postgres + RLS + fila/worker.
- A **transcrição de áudio** está modelada (gating) mas não implementada (depende de provider
  de STT + download de mídia da Cloud API).
