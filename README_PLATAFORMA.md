# Plataforma DGR — Gestão em Resultado

Consultoria estratégica B2B para PMEs + **automação financeira via WhatsApp** + **DG**, o
consultor de IA. Este é o código que materializa o plano de negócios da DGR (PROMPT MESTRE).

> O lema governa o produto: **"Com você em cada passo — do diagnóstico ao lucro."**
> A automação é o meio; **a consultoria inteligente (o DG) é o que se vende.**

Este repositório também contém o toolkit Python anterior (`financeiro/`, `docs/00`–`09`).
Esta plataforma (TypeScript, em `src/`) é a evolução para o produto SaaS da DGR.

## O que já roda (MVP, ponta a ponta)

- **Pipeline "coração"**: mensagem de WhatsApp → extração por IA → persistência → resposta do DG.
- **DG consultor**: persona versionada (`prompts/dg_consultor.md`) + Constituição + RAG + jornada.
- **Entitlements por plano** (Starter/Pro/Enterprise) com gating real.
- **Jornada "Do Diagnóstico ao Lucro"** como máquina de estados por tenant.
- **Dashboard**: KPIs (entra/sai/sobra, recebíveis, **previsão de caixa**) via API HTTP.
- **Notificações**: contas a pagar/receber, caixa baixo, **risco de caixa negativo** (proativo).
- **CRM + agenda inteligente**: pipeline, follow-ups, capacidade × oportunidade, sugestão do DG.
- **Aprendizado anonimizado entre tenants** com trava de privacidade (opt-in + scrub PII + N≥X).
- **Ambiente de demonstração** com uma PME fictícia.

## Pré-requisitos

- **Node.js ≥ 20** (testado em 22). Não precisa de banco nem de chaves para a demo.

## Setup do zero

```bash
# 1) Instalar dependências de desenvolvimento (apenas TypeScript + tipos)
npm install

# 2) (Opcional) configurar credenciais reais
cp .env.example .env   # preencha ANTHROPIC_API_KEY e WHATSAPP_* se for usar de verdade
#   Sem .env, a plataforma roda em modo MOCK determinístico (sem custo).

# 3) Rodar a demonstração ponta a ponta (mensagens → IA → dashboard)
npm run demo

# 4) Rodar os testes da camada crítica (extração, gating, privacidade, jornada, finanças)
npm test

# 5) Subir o servidor (webhook + API de dashboard)
npm run build && npm start
#   GET  http://localhost:3000/health
#   GET  http://localhost:3000/api/tenants/demo_padaria/dashboard
#   POST http://localhost:3000/api/tenants/demo_padaria/message  {"text":"recebi 350 da Maria pelo pix"}
```

## Variáveis de ambiente

| Var | Para quê | Sem ela |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude API (extração + DG) | modo mock determinístico |
| `DGR_MODEL_EXTRACTION` / `DGR_MODEL_CONSULTANT` | modelo por tarefa (COGS) | usa defaults |
| `WHATSAPP_*` | Cloud API da Meta (webhook + envio) | webhook responde 503; demo roda |
| `DGR_LEARNING_MIN_TENANTS` | limiar anti-reidentificação (§5.4) | default 5 |
| `PORT` | porta do servidor | 3000 |

> **Segredos nunca são versionados** (ver `.gitignore`). Use `.env`.

## Estrutura

```
src/
├── core/
│   ├── dgr_constitution.ts   ← Constituição (missão/visão/valores/regras) como constantes
│   ├── entitlements.ts       ← matriz planos × recursos (gating)
│   ├── journey.ts            ← jornada "Do Diagnóstico ao Lucro" (máquina de estados)
│   ├── finance.ts            ← KPIs + previsão de caixa
│   └── types.ts              ← modelo de domínio multi-tenant
├── dg/
│   ├── prompt.ts             ← montagem do system prompt do DG
│   ├── consultant.ts         ← DG consultor (RAG + contexto + gating)
│   ├── extraction.ts         ← mensagem → JSON estruturado
│   ├── rag.ts                ← 2 coleções: curada (citável) × aprendizado anonimizado
│   ├── anthropic.ts          ← cliente Claude (+ mock)
│   └── mockResponder.ts      ← responder determinístico p/ demo sem chave
├── whatsapp/cloudApi.ts      ← WhatsApp Cloud API oficial (assinatura, webhook, envio)
├── notifications/engine.ts   ← alertas financeiros via WhatsApp
├── crm/crm.ts                ← CRM + agenda inteligente
├── learning/anonymization.ts ← retroalimentação entre empresas (trava de privacidade)
├── store/memoryStore.ts      ← store multi-tenant (referência do MVP)
├── pipeline.ts               ← orquestração do núcleo de valor
├── server.ts                 ← webhook + API de dashboard
└── demo/                     ← PME fictícia + roteiro de demonstração
prompts/dg_consultor.md       ← persona do DG (versionada, auditável)
docs/pesquisa/                ← Fase 0: 4 documentos de pesquisa com fontes
docs/04_arquitetura_dgr.md    ← arquitetura completa
docs/05_pendencias.md         ← "NÃO COMPROVADO — validar" + dependências do Andre
```

## Documentação de referência

- **Pesquisa (Fase 0, com fontes):** `docs/pesquisa/01..04`.
- **Inventário do site atual:** `docs/03_inventario_site_atual.md`.
- **Arquitetura:** `docs/04_arquitetura_dgr.md`.
- **Pendências e validações:** `docs/05_pendencias.md`.

## Princípios inegociáveis no código

1. A **Constituição** (`dgr_constitution.ts`) governa toda camada e o system prompt do DG.
2. **Zero suposição**: o DG declara quando não tem evidência; pendências ficam em `docs/05`.
3. **WhatsApp só via Cloud API oficial** (Regra nº 3).
4. **Privacidade entre tenants**: nenhum cliente vê, direta ou indiretamente, dado de outro.
5. **Resultado é o parâmetro nº 1**: cada saída do DG prioriza o que aproxima do lucro.
