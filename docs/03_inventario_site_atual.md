# 03 — Inventário do Site Atual (DGR Gestão em Resultado)

> **Autor:** Engenharia de Front-end · **Data:** 2026-06-29
> **Alvo:** https://www.dgrgestao.com.br/
> **Premissa do briefing:** projeto Lovable (React/Vite, SPA).

---

## ⚠️ AVISO CRÍTICO DE ACESSO — LER PRIMEIRO

**Não foi possível observar o site ao vivo durante esta avaliação.**

O domínio `www.dgrgestao.com.br` (e a forma sem `www`) foi **bloqueado pela política de
egresso do ambiente** em que esta avaliação rodou. Todas as tentativas de acesso
retornaram **HTTP 403 Forbidden** já no nível do túnel CONNECT do proxy de saída:

| Tentativa | Ferramenta | Resultado |
|---|---|---|
| `https://www.dgrgestao.com.br/` | WebFetch | 403 Forbidden |
| `https://dgrgestao.com.br/` | WebFetch | 403 Forbidden |
| `https://www.dgrgestao.com.br/` | curl (via proxy) | `CONNECT tunnel failed, response 403` |
| `site:dgrgestao.com.br` | WebSearch | domínio **não indexado**; resultados retornaram outros DGRs não relacionados |

Registro do próprio proxy confirmando o bloqueio de política:

```
"recentRelayFailures": [{
  "kind": "connect_rejected",
  "detail": "gateway answered 403 to CONNECT (policy denial or upstream failure)",
  "host": "www.dgrgestao.com.br:443"
}]
```

A política do proxy instrui explicitamente **não burlar nem repetir negações 403/407**,
e sim reportá-las. Portanto, **não inventei conteúdo do site**. Tudo que dependeria de
observação direta (copy, cores, componentes, HTML/JS) está marcado abaixo como
**`NÃO ACESSÍVEL — validar com Andre`**.

**O que ainda é entregável com confiança:** a metodologia de inventário (o que olhar e
como), e a recomendação estratégica Lovable-vs-repo-próprio — porque esta última se apoia
na premissa **já dada no briefing** de que o site é um projeto Lovable, e não em
observação do site. Onde a recomendação depende de detalhes não vistos, isso está sinalizado.

### Como destravar o inventário factual (ação para o Andre)

Para que este documento seja preenchido com observações reais, escolha **uma**:

1. **Liberar o domínio na política de egresso** do ambiente do agente (allowlist de
   `dgrgestao.com.br` / `*.dgrgestao.com.br`), e reexecutar esta avaliação.
2. **Enviar artefatos do site**: HTML renderizado (`view-source` ou "salvar página
   como"), `index.html` do build, prints de cada página/seção, e — se houver — acesso de
   leitura ao projeto Lovable ou ao repositório/export.
3. **Compartilhar o export do Lovable** (GitHub connect do Lovable ou ZIP de export), que
   contém `package.json`, `vite.config.ts`, `tailwind.config.ts`, componentes e tokens —
   permitindo um inventário técnico completo e preciso.

---

## Sumário

- O site **não pôde ser inspecionado** nesta rodada (bloqueio 403 de política + domínio
  não indexado em busca). Ver aviso acima.
- Em consequência, **páginas, copy, identidade visual, componentes e stack confirmada por
  inspeção** estão todos **`NÃO ACESSÍVEL — validar com Andre`**.
- A **stack presumida pelo briefing** é Lovable → React + Vite + SPA, tipicamente com
  Tailwind CSS, shadcn/ui (Radix) e assinaturas `gptengineer`/`lovable` no HTML. **Não
  confirmado por inspeção** — checklist de confirmação fornecido na seção "Stack".
- A **recomendação estratégica** (abaixo) é entregue de forma condicional e robusta às
  duas hipóteses, com viés explícito de menor retrabalho / maior controle.

---

## Inventário de Páginas

> Não foi possível enumerar rotas, URLs, menu de navegação nem âncoras. Por ser uma SPA
> Lovable, o roteamento normalmente é client-side (`react-router`), o que também dificulta
> indexação por buscadores — coerente com o domínio não aparecer em `site:`.

| Item | Status |
|---|---|
| Lista de páginas / rotas | `NÃO ACESSÍVEL — validar com Andre` |
| URLs canônicas de cada página | `NÃO ACESSÍVEL — validar com Andre` |
| Itens de menu / navegação | `NÃO ACESSÍVEL — validar com Andre` |
| Âncoras internas (one-page?) | `NÃO ACESSÍVEL — validar com Andre` |
| Links externos (WhatsApp, Instagram, etc.) | `NÃO ACESSÍVEL — validar com Andre` |
| Existência de blog / páginas legais (privacidade, termos) | `NÃO ACESSÍVEL — validar com Andre` |

### Copy / Textos principais

| Item | Status |
|---|---|
| Headline (H1) | `NÃO ACESSÍVEL — validar com Andre` |
| Proposta de valor / subheadline | `NÃO ACESSÍVEL — validar com Andre` |
| CTAs (texto dos botões/links) | `NÃO ACESSÍVEL — validar com Andre` |
| Seções da home e seus textos | `NÃO ACESSÍVEL — validar com Andre` |
| Nomes e textos de planos / serviços | `NÃO ACESSÍVEL — validar com Andre` |
| FAQ (perguntas e respostas) | `NÃO ACESSÍVEL — validar com Andre` |
| Texto de rodapé (footer) | `NÃO ACESSÍVEL — validar com Andre` |

---

## Identidade Visual

> Nenhum pixel observado. Não há base factual para reportar cores, tipografia ou logo.

| Item | Status |
|---|---|
| Paleta de cores (hex) | `NÃO ACESSÍVEL — validar com Andre` |
| Tipografia (famílias, pesos) | `NÃO ACESSÍVEL — validar com Andre` |
| Logo (presença, formato, variações) | `NÃO ACESSÍVEL — validar com Andre` |
| Iconografia / ilustrações / fotos | `NÃO ACESSÍVEL — validar com Andre` |
| Favicon / OG image | `NÃO ACESSÍVEL — validar com Andre` |

**Quando o acesso for liberado, capturar:** variáveis CSS (`:root { --... }`),
`tailwind.config` (`theme.extend.colors`), `font-family` no `<head>`/Google Fonts, e o
arquivo do logo (SVG idealmente). Em projetos Lovable os tokens costumam viver em
`index.css`/`tailwind.config.ts` — fonte ideal para preservar a identidade.

---

## Componentes (reutilizáveis aparentes)

| Componente | Status |
|---|---|
| Hero | `NÃO ACESSÍVEL — validar com Andre` |
| Cards de planos / serviços | `NÃO ACESSÍVEL — validar com Andre` |
| Formulários (contato / lead) | `NÃO ACESSÍVEL — validar com Andre` |
| FAQ (accordion) | `NÃO ACESSÍVEL — validar com Andre` |
| Header / navbar | `NÃO ACESSÍVEL — validar com Andre` |
| Footer | `NÃO ACESSÍVEL — validar com Andre` |
| Botão flutuante de WhatsApp | `NÃO ACESSÍVEL — validar com Andre` |

> Nota técnica (não-observada, apenas expectativa de plataforma): projetos Lovable
> normalmente usam **shadcn/ui** (componentes Radix em `src/components/ui/`), o que tende a
> facilitar o reaproveitamento — **a confirmar** com o export.

---

## Formulários e Integrações visíveis

| Integração | Status |
|---|---|
| Formulário de contato (campos / endpoint / destino) | `NÃO ACESSÍVEL — validar com Andre` |
| WhatsApp (link `wa.me` / número) | `NÃO ACESSÍVEL — validar com Andre` |
| E-mail de contato | `NÃO ACESSÍVEL — validar com Andre` |
| Analytics (GA4 / GTM / Plausible) | `NÃO ACESSÍVEL — validar com Andre` |
| Pixel de marketing (Meta/Google Ads) | `NÃO ACESSÍVEL — validar com Andre` |
| Backend / CMS / banco de dados (Supabase?) | `NÃO ACESSÍVEL — validar com Andre` |

---

## Stack detectada

**Status da confirmação: NÃO CONFIRMADA POR INSPEÇÃO.** O HTML/JS/meta-tags não puderam
ser baixados (403). Abaixo está (a) o que o **briefing afirma** e (b) **como confirmar**
quando o acesso existir.

**Afirmado pelo briefing (não verificado por mim):** projeto **Lovable → React + Vite,
SPA**.

**Assinaturas a procurar no HTML/JS retornado (checklist de confirmação):**

| Sinal | Onde olhar | O que indica |
|---|---|---|
| `<script type="module" src="/assets/index-*.js">` + `/@vite/` ou hashes `index-[hash].js` | `view-source` do HTML | Build **Vite** |
| `id="root"` + bundle React, `react`/`react-dom` no JS | HTML / JS | **React SPA** |
| Meta/marcação `gptengineer`, `lovable`, `<script src="https://cdn.gpteng.co/gptengineer.js">` | `<head>` | Origem **Lovable / GPT Engineer** |
| `data-lovable` / comentários `lovable` / `og:image` em `*.lovableproject.com` | HTML/meta | Hospedagem ou origem **Lovable** |
| Classes utilitárias `flex gap-4 ...`, `class="dark"`, variáveis `--background`/`--foreground` | DOM/CSS | **Tailwind + shadcn/ui** |
| `supabase` no JS, chamadas a `*.supabase.co` | Network/JS | Backend **Supabase** (padrão Lovable) |

> **Ação:** preencher esta tabela com ✅/❌ após inspecionar o HTML real. Até lá, a stack
> permanece **presumida**, não detectada.

---

## Tabela "Reaproveitar vs Reconstruir"

> ⚠️ Tabela **condicional**: as decisões pressupõem o cenário típico de um site Lovable
> institucional. Cada linha deve ser **confirmada** após a inspeção real do site/export.
> Enquanto isso, tratar como hipótese de trabalho, não como veredito.

| Item | Decisão (provisória) | Justificativa |
|---|---|---|
| Identidade visual (cores, tipografia, logo) | **Reaproveitar 100%** | Briefing exige preservar a identidade; tokens de Tailwind/CSS migram diretamente. Não há motivo para refazer marca já aprovada. |
| Copy / textos (headline, seções, FAQ) | **Reaproveitar** | Conteúdo é ativo de marketing já publicado; portável como dados/markdown independente do framework. |
| Layout / composição das seções (hero, cards, etc.) | **Reaproveitar (com migração)** | Estrutura de página é replicável 1:1 em qualquer Vite/Next + Tailwind. Migra-se o JSX, não se redesenha. |
| Componentes shadcn/ui (botões, accordion, inputs) | **Reaproveitar** | São copiáveis entre projetos React+Tailwind por design (não são dependência opaca). |
| Roteamento client-side (SPA) | **Reconstruir/Reavaliar** | Se houver meta de SEO, trocar SPA pura por SSR/SSG (Next ou Vite+prerender) reduz dívida de indexação — coerente com o site não aparecer em busca. |
| Formulário de contato / captura de lead | **Reconstruir o backend** | Em Lovable o envio costuma depender de Supabase/serviço da plataforma; ao sair, precisa de endpoint próprio (e-mail/CRM/WhatsApp). |
| Integração de backend / dados (Supabase) | **Reavaliar conforme uso** | Se for só formulário, substituível por serviço simples; se houver área logada/dados, decisão de maior peso — **depende do que existe** (não observado). |
| Analytics / pixels | **Reconstruir/Reinjetar** | Scripts são trechos pequenos; reinseri-los no novo projeto é trivial. |
| Infra de build/deploy do Lovable | **Reconstruir** | Sair do Lovable implica novo pipeline (Vercel/Netlify/etc.). |

---

## Recomendação de caminho de evolução

> A recomendação **não depende de detalhes não vistos** — ela se apoia na premissa, dada
> pelo briefing, de que é um projeto Lovable. É segura sob ambas as hipóteses de conteúdo.

### Recomendação: **(b) Migrar o front para repositório próprio (Vite + Tailwind), preservando 100% da identidade visual.**

**Por que (b), com o objetivo de menor retrabalho e maior controle:**

- **Menor retrabalho real:** o Lovable já gera projeto **Vite + React + Tailwind +
  shadcn/ui**. Migrar para um repo Vite/Tailwind é, em grande parte, **portar o código que
  já existe** — não reescrever do zero. A identidade visual (tokens Tailwind/CSS) vai
  junto, atendendo ao requisito de preservar 100%.
- **Maior controle:** repositório próprio dá versionamento Git real, CI/CD à sua escolha,
  liberdade de dependências, backend próprio (e-mail/CRM/WhatsApp/banco) sem amarra de
  plataforma, e domínio/deploy sob seu controle — sem teto de roadmap do Lovable.
- **Caminho de saída do Lovable é de baixo atrito:** o Lovable oferece **conexão com
  GitHub / export**, então o ponto de partida da migração é o próprio código atual.
- **Recomendação dentro de (b):** se SEO importa para um site institucional (gerar leads
  organicamente), preferir **Next.js (SSG/SSR) + Tailwind**; se SEO for secundário e a
  prioridade é portar com mínimo esforço, **Vite + Tailwind + prerender** mantém o código
  mais próximo do original. Em ambos os casos, **identidade preservada via tokens Tailwind**.

### Prós e Contras

**(a) Continuar no Lovable e conectar a um backend**

- Prós: zero esforço de migração imediato; iteração visual rápida via prompts; mantém o
  fluxo atual; conexão nativa a Supabase facilita um backend rápido.
- Contras: dependência de plataforma (lock-in) e do roadmap/preço do Lovable; controle
  limitado sobre build, dependências e infra; SPA pura tende a SEO fraco; backend "fácil"
  do Lovable pode virar amarra quando os requisitos crescerem; menos controle de
  governança/segurança de código.

**(b) Migrar para repositório próprio (Vite/Next + Tailwind) — RECOMENDADO**

- Prós: controle total (código, CI/CD, deps, infra, backend, domínio); sem lock-in;
  identidade 100% preservável via tokens; caminho aberto a SSR/SSG para SEO; aproveita o
  que o Lovable já produziu (não é reescrita do zero).
- Contras: exige montar pipeline de deploy e backend de formulário/integrações; trabalho
  inicial de portar e organizar o repo; perde-se a edição "por prompt" do Lovable (mitigado
  por usar Claude Code / IDE no novo repo).

> **Bloqueio para fechar a recomendação com números:** o **tamanho do esforço de (b)** e a
> linha "Reavaliar Supabase" dependem de **quanto backend/estado o site realmente tem** —
> algo **não observado** nesta rodada. Validar com Andre / com o export antes de orçar.

---

## Pendências para o Andre (consolidado)

1. **Liberar acesso** ao domínio no proxy **ou** enviar HTML renderizado / export do
   Lovable / prints — para preencher páginas, copy, identidade, componentes e stack.
2. **Confirmar a stack** rodando o checklist da seção "Stack detectada" sobre o HTML real.
3. **Informar se há backend/área logada/dados** (ou só formulário) — define o peso de (b).
4. **Definir prioridade de SEO** — decide entre Next (SSG/SSR) e Vite+prerender dentro de (b).
