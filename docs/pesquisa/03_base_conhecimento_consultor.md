# 03 — Base de Conhecimento do Consultor "DG"

> **Curadoria:** base de conhecimento que sustenta o aconselhamento do **DG**, consultor de IA da
> **DGR Gestão em Resultado** (consultoria administrativa para PMEs brasileiras com faturamento até
> **R$ 10M/ano**).
>
> **Data de curadoria / data de acesso de todas as fontes:** **2026-06-29**.
>
> **REGRA DE OURO — ZERO suposição:** toda "medida que funciona" precisa de caso ou dado que a
> comprove, com fonte. Onde não há evidência consolidada, o item é marcado **`NÃO COMPROVADO —
> validar`** e NÃO deve ser apresentado pelo DG como fato.

---

## Sumário

1. [Como ler esta base](#1-como-ler-esta-base)
2. [Perfil do ICP da DGR](#2-perfil-do-icp-da-dgr)
3. [CAMADA TEÓRICA — referências consolidadas de Administração](#3-camada-teórica--referências-consolidadas-de-administração)
4. [CAMADA PRÁTICA — medidas comprovadas para PMEs brasileiras](#4-camada-prática--medidas-comprovadas-para-pmes-brasileiras)
   - 4.1 [Benchmarks e contexto (dados-base)](#41-benchmarks-e-contexto-dados-base)
   - 4.2 [Catálogo de medidas que funcionam](#42-catálogo-de-medidas-que-funcionam)
   - 4.3 [Itens NÃO COMPROVADOS — fila de validação](#43-itens-não-comprovados--fila-de-validação)
5. [Especificação de RAG — ingestão e consulta pelo DG](#5-especificação-de-rag--ingestão-e-consulta-pelo-dg)
6. [Fontes](#6-fontes)

---

## 1. Como ler esta base

A base tem **duas camadas com pesos distintos**:

- **Camada Teórica** — o "porquê". Bibliografia e frameworks canônicos de Administração que dão
  fundamento ao raciocínio do DG. Serve para estruturar a análise, **não** para alegar resultado.
- **Camada Prática (peso maior)** — o "o que de fato funciona em PME brasileira". Cada medida está
  amarrada a um **dado/caso com fonte**, à **faixa de faturamento** em que se aplica e ao **tipo de
  PME**. É daqui que o DG tira recomendações acionáveis.

**Separação fundamental de proveniência** (detalhada na §5):

| Origem | O que é | Como o DG trata |
|---|---|---|
| **Conhecimento curado pela DGR** | Esta base (teoria + prática com fonte pública) | Citável, estável, versionado |
| **Aprendizado anonimizado da base de clientes** | Padrões agregados dos próprios clientes da DGR | Usado como *insight* interno, **nunca** citado como fonte pública; sempre anonimizado e marcado |

---

## 2. Perfil do ICP da DGR

PME brasileira, faturamento **até R$ 10M/ano**. O leque é largo e o que funciona muda com o porte —
por isso toda medida prática carrega faixa. Faixas de trabalho adotadas nesta base:

| Faixa | Faturamento/mês (aprox.) | Faturamento/ano | Perfil típico | Característica de gestão |
|---|---|---|---|---|
| **F1 — Micro inicial** | até ~R$ 30k | até ~R$ 360k | MEI / microempresa, dono opera tudo | Caixa no susto, controle no caderno/WhatsApp |
| **F2 — Micro estruturando** | ~R$ 30k–100k | ~R$ 360k–1,2M | ME, 1ª contratação de admin | Planilha, separa PF/PJ ainda parcialmente |
| **F3 — Pequena em tração** | ~R$ 100k–350k | ~R$ 1,2M–4,2M | EPP, time de 5–20 | Já tem ERP/contador; falta controladoria |
| **F4 — Pequena consolidada** | ~R$ 350k–830k | ~R$ 4,2M–10M | EPP/indústria, 20–50+ | Busca margem, governança, profissionalização |

> Nota: o cliente-piloto da própria DGR (ver `docs/00-visao-e-arquitetura.md`) é **indústria, Lucro
> Presumido, ~R$ 10M/ano** — extremo superior do ICP (F4). O DG precisa servir do MEI ao F4.

---

## 3. CAMADA TEÓRICA — referências consolidadas de Administração

Referências canônicas de graduação/pós em Administração e frameworks reconhecidos. Servem de
fundamento ao raciocínio; **não** são evidência de que "funciona" numa PME — para isso, §4.

| Obra / Tema | Tipo | Relevância para o ICP da DGR |
|---|---|---|
| **Gestão Financeira / Finanças Corporativas** (Gitman, *Princípios de Administração Financeira*; Assaf Neto, *Finanças Corporativas e Valor*) | Livro canônico | Base de fluxo de caixa, capital de giro, liquidez e rentabilidade — exatamente as dores nº 1 das PMEs (§4.1). Assaf Neto é referência brasileira, adapta ao contexto local (juros altos, tributação). |
| **Demonstração de Resultado (DRE) gerencial** | Framework | Traduz "quanto entrou/saiu" em margem de contribuição → lucro. Indispensável para F2–F4 que confundem faturamento com lucro. |
| **Ponto de Equilíbrio (break-even) e Margem de Contribuição** | Framework | Responde "a partir de quanto eu paro de ter prejuízo". Aplicável já em F1. Base da precificação correta (§4.2). |
| **Ciclo Financeiro / Cash Conversion Cycle (PMR + PME − PMP)** | Framework | Explica por que empresa "lucrativa" quebra por falta de caixa. Núcleo do diagnóstico de capital de giro (§4.1). |
| **Necessidade de Capital de Giro (NCG/NICG)** — modelo Fleuriet (*O Modelo Fleuriet*, Fleuriet/Kehdy/Blanc) | Framework brasileiro | Modelo de gestão de capital de giro desenvolvido no Brasil; trata sazonalidade e financiamento do giro — comum em indústria/comércio do ICP. |
| **Contabilidade de Custos / Custeio** (Martins, *Contabilidade de Custos*) | Livro canônico | Custeio por absorção × variável, rateio, markup. Sustenta precificação e controle de custos (§4.2). Martins é a referência brasileira padrão. |
| **Administração de Marketing** (Kotler & Keller; Kotler, *Marketing 4.0*) | Livro canônico | Segmentação, posicionamento, mix de marketing, funil. Fundamenta canais digitais (§4.2) sem cair em "fórmula mágica". |
| **Jobs To Be Done (JTBD)** (Christensen, *Competing Against Luck*) | Framework | Foca a PME no "trabalho" que o cliente contrata o produto para fazer — útil para reposicionamento e priorização de oferta com pouco orçamento. |
| **Unit Economics / LTV, CAC, payback** | Framework | Mede se cada cliente/unidade dá lucro. Crítico para PME que cresce em vendas mas queima caixa (escala não resolve modelo ruim). |
| **Estratégia Competitiva** (Porter, *Estratégia Competitiva* / 5 Forças; *Vantagem Competitiva*) | Livro canônico | Análise setorial e fonte de vantagem (custo × diferenciação) — orienta onde a PME pode competir sem brigar só por preço. |
| **A Estratégia do Oceano Azul** (Kim & Mauborgne) | Livro | Alternativa pragmática à guerra de preço — relevante para PME espremida por concorrência (causa frequente de mortalidade, §4.1). |
| **Administração da Produção e Operações** (Slack, *Administração da Produção*) | Livro canônico | Capacidade, estoque, lead time, qualidade — direto para o ICP industrial (F4) e comércio com estoque. |
| **Gestão de Estoques / Lean / Just-in-Time** | Framework | Estoque parado = caixa parado; conecta operação a ciclo financeiro. Aplicável a comércio e indústria. |
| **Gestão de Vendas e CRM / Funil de Vendas / Pipeline** | Framework | Estrutura previsão de receita e cobrança — base da gestão de inadimplência e do PMR (§4.2). |
| **The Lean Startup** (Ries) | Livro | Validação com baixo custo, métricas acionáveis — útil para F1–F2 testando produto/canal sem queimar caixa. |
| **Balanced Scorecard** (Kaplan & Norton) | Framework | Conecta indicadores financeiros e não-financeiros a metas — para F4 profissionalizando governança. *Cuidado: pode ser pesado demais para F1–F2.* |
| **Comportamento Organizacional / Gestão de Pessoas** (Robbins; Chiavenato, *Gestão de Pessoas*) | Livro canônico | Fundamenta RH/pró-labore, retenção e estrutura de time — Chiavenato é base de referência no Brasil. |

> **Como o DG usa a teoria:** para *estruturar* o diagnóstico e nomear o problema corretamente.
> Nunca para afirmar "isso aumenta seu lucro em X%". Afirmações de resultado **só** vêm da §4.

---

## 4. CAMADA PRÁTICA — medidas comprovadas para PMEs brasileiras

### 4.1 Benchmarks e contexto (dados-base)

Dados públicos que descrevem o terreno do ICP. Servem para o DG **calibrar urgência** e
**priorizar**. Todas as fontes em §6, acesso 2026-06-29.

| Indicador | Dado | Fonte (ver §6) |
|---|---|---|
| Mortalidade em 5 anos (geral) | ~6 em cada 10 micro e pequenas empresas encerram em até 5 anos | SEBRAE / Agência Brasil [F1] |
| Mortalidade em 5 anos por porte | MEI 29%; ME 21,6%; EPP 17% | SEBRAE / ASN-RJ [F2] |
| Mortalidade por setor | Comércio 30,2% (maior); indústria extrativa 14,3% (menor) | SEBRAE / ASN-RJ [F2] |
| Causa de fechamento | 22% citam **falta de capital de giro**; 20% baixo volume de vendas | SEBRAE / Agência Brasil [F1] |
| Conhecimento financeiro | **43%** têm pouco/nenhum conhecimento sobre Necessidade de Investimento em Capital de Giro (NICG); 25,4% conhecimento insuficiente de fluxo de caixa operacional | Revista Eletrônica de Ciências Contábeis (FACCAT), citando pesquisa [F3] |
| Mistura PF/PJ | **51%** das pequenas empresas usam conta de pessoa física para pagar despesas da empresa (pesquisa c/ +6 mil empresários) | SEBRAE, via Matur Contábil [F8] |
| Insegurança na precificação | **89%** dos empreendedores não se sentem confiantes ao formar preço (Preço Certo, +10 mil empresas) | SEBRAE/RN, citando Preço Certo [F4] |
| Inadimplência | **1 em cada 4** (25%) das MPEs sofre com inadimplência; ~30% das despesas vão para dívidas em atraso; MEI: peso chega a ~63% | SEBRAE / CNN Brasil / FENACON [F5][F6] |
| Digitalização | ~**75%** dos pequenos negócios vendem por canais digitais; WhatsApp 81%, Instagram 60%; **48%** já investiram em propaganda paga | SEBRAE / Exame / DataSebrae [F7] |
| Acesso a crédito | Pequenos negócios acessam só **~20%** do crédito do país; ~88% relatam dificuldade; Fampe garante até 100% do empréstimo | SEBRAE / ASN [F9] |
| Distribuição setorial dos CNPJs | Serviços 54,8%; comércio 28,1%; indústria 8,8%; construção 7,6% | SEBRAE / FENACON [F6] |

### 4.2 Catálogo de medidas que funcionam

Cada linha: **medida → problema que resolve → evidência/fonte → faixa → tipo de PME**. O DG só
recomenda como "comprovado" o que está aqui.

| # | Medida que funciona | Problema que resolve | Evidência / Fonte (§6) | Faixa | Tipo de PME |
|---|---|---|---|---|---|
| M1 | **Implantar fluxo de caixa diário** (entradas/saídas, previsão) | Empresa lucrativa que quebra por falta de caixa; 22% fecham por falta de capital de giro | SEBRAE: fluxo de caixa é a ferramenta para garantir capital de giro; falta de controle é causa direta de fechamento [F1][F10] | F1–F4 | Todas; crítico já em F1 |
| M2 | **Separar conta PF da conta PJ + definir pró-labore fixo mensal** | Confusão patrimonial; 51% usam conta PF para a empresa; impossível medir lucro real | SEBRAE (8 dicas / pró-labore): separar contas e fixar pró-labore registrado como despesa; risco de confusão patrimonial em falência [F8] | F1–F3 (dor maior em F1–F2) | Todas, esp. dono-operador |
| M3 | **Precificar por markup cobrindo TODOS os custos** (produção, frete, embalagem, impostos, taxas bancárias) + revisão periódica | Vender abaixo do custo; preço "no feeling"; preço congelado por meses/anos corrói margem | SEBRAE: erros de precificação são "vilão da saúde financeira"; markup é o método tradicional; planilha gratuita disponível [F4] | F1–F4 | Comércio e indústria; serviços com adaptação |
| M4 | **Calcular ponto de equilíbrio e margem de contribuição** | Não saber o faturamento mínimo para não ter prejuízo; metas de venda sem base | SEBRAE/PR: precificação, margem de lucro e ponto de equilíbrio como tripé de domínio financeiro [F4] | F1–F4 | Todas |
| M5 | **Gerir ciclo financeiro (PMR + PME − PMP)** reduzindo PMR e estoque e negociando PMP | Necessidade de capital de giro alta; descasamento receber × pagar | SEBRAE: ciclo financeiro = PMR+PME−PMP; benchmarks setoriais (indústria 45–90 dias; serviços/SaaS B2B 35–45 dias PMR) [F11] | F2–F4 | Indústria, comércio (estoque), serviços B2B |
| M6 | **Política de crédito e cobrança estruturada** (análise antes de vender a prazo + régua de cobrança) | Inadimplência atinge 25% das MPEs; ~30% das despesas presas em atraso | SEBRAE: gestão coordenada de crédito + recuperação de atrasos reduz perdas de inadimplência [F5][F12] | F2–F4 | Vendas B2B / a prazo; comércio e indústria |
| M7 | **Vender por canais digitais** (WhatsApp, Instagram) e usar propaganda paga com método | Baixo volume de vendas (20% das causas de fechamento) | SEBRAE/DataSebrae: ~75% já vendem por canal digital; WhatsApp 81%, Instagram 60%; 48% investiram em ads — patamar histórico em 2025 [F7] | F1–F4 | Comércio, serviços; B2C e B2B leve |
| M8 | **Controle/giro de estoque** (compras alinhadas ao consumo) para liberar caixa | Estoque parado = caixa parado; desperdício | SEBRAE (case padaria): ajuste de compras/produção via análise de fluxo reduziu custo e aumentou margem; "bom giro faz o dinheiro circular" [F10] | F2–F4 | Comércio com estoque, indústria, alimentação |
| M9 | **Usar Fampe/garantia para acessar crédito de giro** quando o descasamento é estrutural | Crédito caro/negado por falta de garantia; só ~20% do crédito vai a MPE | SEBRAE: Fampe garante até 100% do empréstimo mesmo sem garantia real [F9] | F2–F4 | Todas que precisam financiar giro/expansão |
| M10 | **Adotar DRE gerencial mensal** para enxergar lucro real (não faturamento) | Confundir faturamento com lucro; decidir no escuro | SEBRAE: fluxo de caixa + DRE permitem prever resultado de caixa e lucro líquido [F10] | F2–F4 | Todas com alguma estrutura |
| M11 | **Diagnóstico de indicadores financeiros** (liquidez, rentabilidade, lucratividade, NCG) | Falta de leitura objetiva da saúde do negócio | SEBRAE: diagnóstico de indicadores e índices de atividade (PMR etc.) com base em estoque, contas a receber/pagar [F11][F13] | F3–F4 | EPP, indústria |

### 4.3 Itens NÃO COMPROVADOS — fila de validação

O DG **não** pode apresentar estes como fato. Hipóteses plausíveis aguardando dado/caso com fonte.

| Item | Por que está em dúvida | O que falta |
|---|---|---|
| "Reduzir PMR em X dias aumenta o lucro em Y%" | Quantificação genérica varia muito por setor/porte | `NÃO COMPROVADO — validar` com caso real do ICP por faixa |
| "Balanced Scorecard melhora resultado em PME pequena" | Evidência é de média/grande empresa; pode ser pesado p/ F1–F2 | `NÃO COMPROVADO — validar` aplicabilidade em F1–F3 |
| "Aumento médio de margem após consultoria DGR = Z%" | Seria aprendizado da própria base de clientes, não fonte pública | Coletar via §5 (camada anonimizada), marcar como interno |
| Benchmarks de PMR/PME/PMP por subsetor brasileiro | Números de §4 vêm de blog/agregador, não de série oficial por CNAE | `NÃO COMPROVADO — validar` com DataSebrae/IBGE por CNAE |
| ROI específico de propaganda paga para PME por setor | Há adesão (48%), mas não retorno comprovado por faixa | `NÃO COMPROVADO — validar` com estudo de eficácia |

---

## 5. Especificação de RAG — ingestão e consulta pelo DG

Como esta base é ingerida, recuperada e citada pelo DG em produção. **Princípio central:** separar
sempre **`curado_dgr`** (conhecimento público curado) de **`aprendizado_base`** (padrões
anonimizados dos clientes da DGR).

### 5.1 Duas coleções vetoriais separadas (não misturar)

| Coleção | Conteúdo | Citável ao cliente? | Atualização |
|---|---|---|---|
| **`kb_curado_dgr`** | Esta base: teoria + medidas práticas com fonte pública | **Sim** — cita fonte+data | Curadoria humana DGR, versionada em git |
| **`kb_aprendizado_anon`** | Padrões agregados e anonimizados da carteira DGR (ex.: "em F3 indústria, PMR mediano observado = N dias") | **Não como fonte pública** — usar como *insight*, sempre rotulado "padrão interno anonimizado" | Pipeline de anonimização + revisão |

Isolar em coleções distintas impede que um aprendizado interno seja recuperado e apresentado como
se fosse dado SEBRAE. Filtro obrigatório por `proveniencia` na recuperação.

### 5.2 Formato do documento / chunk

- **Chunking:** *paragraph-aware*, **512–800 tokens**, **15–20% de overlap** (alinhado às boas
  práticas de RAG em produção [R1][R2]). Tabelas de medidas: **1 medida = 1 chunk** (M1, M2, …)
  para recuperação atômica e citação precisa.
- **Metadados obrigatórios por chunk:**

```yaml
id: "M5"
camada: "pratica"          # teorica | pratica | benchmark
proveniencia: "curado_dgr" # curado_dgr | aprendizado_anon
tema: ["capital_de_giro", "ciclo_financeiro"]
setor: ["industria", "comercio", "servicos"]   # ou "todos"
faixa: ["F2","F3","F4"]                          # ver §2
tipo_pme: ["a_prazo_b2b"]
status_evidencia: "comprovado"  # comprovado | nao_comprovado
fonte_titulo: "SEBRAE/PR — Ciclo Econômico, Operacional e Financeiro"
fonte_url: "https://sebraepr.com.br/comunidade/artigo/ciclo-operacional-financeiro-e-economico"
fonte_data_acesso: "2026-06-29"
versao_doc: "2026-06-29"
```

### 5.3 Embeddings e recuperação

- **Embeddings:** modelo multilíngue forte em **português** (a base é PT-BR). Reindexar a cada
  alteração da versão do documento.
- **Recuperação híbrida** (denso + BM25) — recupera semântica e termos exatos como "pró-labore",
  "Fampe", "markup"; ganho de recall consistente [R1][R3].
- **Filtragem por metadados ANTES do ranqueamento:** dado o perfil do cliente em atendimento,
  filtrar por `faixa`, `setor` e `proveniencia`. Ex.: cliente F1 comércio → recuperar medidas
  marcadas para F1 e comércio/"todos"; **excluir** chunks `status_evidencia: nao_comprovado` da
  recuperação que alimenta afirmações de resultado.
- **top-K** pequeno (5–8) + *re-rank*; preferir chunks `comprovado` da coleção `curado_dgr`.

### 5.4 Grounding e citação na resposta do DG

- **Regra de ouro embutida no prompt do DG:** *só afirmar que uma medida "funciona" se houver chunk
  `status_evidencia: comprovado` com `fonte_url`. Caso contrário, dizer que é hipótese a validar.*
- **Formato de citação ao cliente** (a partir dos metadados):

  > "Recomendo estruturar o fluxo de caixa diário. Empresas que não controlam o caixa estão entre as
  > que mais fecham por falta de capital de giro — *(SEBRAE, acesso em 29/06/2026)*."

- **Insight interno anonimizado** aparece com rótulo distinto, nunca como fonte pública:

  > "Padrão interno (anonimizado) da carteira DGR: empresas F3 de indústria costumam ter PMR
  > elevado — vale conferir o seu."

- **Sem fonte → sem alegação.** Se a recuperação só traz `nao_comprovado`, o DG responde com a
  ressalva "isto ainda não está comprovado para o seu porte; sugiro validarmos".

### 5.5 Curadoria e governança

- **Mestre = repositório git** (coerente com `docs/00-visao-e-arquitetura.md`): versionado,
  auditável, com histórico de fontes/datas.
- **Revisão trimestral** dos dados SEBRAE (taxas mudam ano a ano) — atualizar `fonte_data_acesso`.
- **Pipeline de anonimização** para `kb_aprendizado_anon`: remover identificadores, exigir N mínimo
  de clientes por padrão (evita reidentificação), revisão humana antes de indexar.

---

## 6. Fontes

> Todas acessadas em **2026-06-29**.

- **[F1]** Agência Brasil / SEBRAE — *Pequenos negócios têm maior taxa de mortalidade*. https://agenciabrasil.ebc.com.br/economia/noticia/2021-06/sebrae-pequenos-negocios-tem-maior-taxa-de-mortalidade
- **[F2]** ASN-RJ / SEBRAE — *MEI tem a maior taxa de mortalidade no Brasil* (por porte e setor). https://rj.agenciasebrae.com.br/cultura-empreendedora/pesquisa-do-sebrae-aponta-que-microempreendedores-individuais-tem-a-maior-taxa-de-mortalidade-no-brasil/
- **[F3]** Revista Eletrônica de Ciências Contábeis (FACCAT) — *Fluxo de caixa e capital de giro: práticas e desafios*. https://seer.faccat.br/index.php/contabeis/article/view/3836
- **[F4]** SEBRAE/RN e SEBRAE/PR — precificação, markup, ponto de equilíbrio (89% insegurança). https://blog.rn.sebrae.com.br/precificar-produto-2026/ · https://sebraepr.com.br/comunidade/artigo/precificacao,-margem-de-lucro-e-ponto-de-equilibrio-voce-domina-esses-conceitos
- **[F5]** CNN Brasil / SEBRAE — *Inadimplência atinge 1 em cada 4 pequenos negócios*. https://www.cnnbrasil.com.br/economia/financas/inadimplencia-atinge-1-em-cada-4-pequenos-negocios-no-brasil-aponta-sebrae/
- **[F6]** FENACON / SEBRAE — *Inadimplência atinge 7,7 milhões; distribuição setorial dos CNPJs*. https://fenacon.org.br/noticias/numero-de-pequenos-negocios-e-recorde-mas-inadimplencia-atinge-77-milhoes/
- **[F7]** Exame / DataSebrae — *75% das pequenas empresas usam canais digitais*; publicidade digital. https://exame.com/negocios/cada-vez-mais-conectadas-75-das-pequenas-empresas-usam-canais-digitais-para-ampliar-vendas/ · https://datasebrae.com.br/transformacao-digital/
- **[F8]** Matur Contábil, citando pesquisa SEBRAE — *51% usam conta PF para a empresa*; separação PF/PJ e pró-labore. https://maturcontabil.com.br/conteudos-gratuitos/separacao-entre-pessoa-fisica-e-juridica/ · SEBRAE/PE: https://sebrae.com.br/sites/PortalSebrae/ufs/pe/artigos/como-separar-as-financas-pessoais-das-financas-da-empresa-8-dicas,6f0ad38b1525a810VgnVCM1000001b00320aRCRD
- **[F9]** ASN / SEBRAE — *Pequenos negócios acessam apenas 20% do crédito*; Fampe garante até 100%. https://agenciasebrae.com.br/economia-e-politica/pequenos-negocios-acessam-apenas-20-do-mercado-de-credito-brasileiro/ · https://sebraepr.com.br/impulsiona/financiamento-dos-pequenos-negocios-no-brasil-2025/
- **[F10]** SEBRAE — *Para ter uma empresa saudável é preciso controlar o fluxo de caixa* (case padaria; DRE + fluxo). https://m.sebrae.com.br/sites/PortalSebrae/artigos/para-ter-uma-empresa-saudavel-e-preciso-controlar-o-fluxo-de-caixa,e27a5415e6433410VgnVCM1000003b74010aRCRD
- **[F11]** SEBRAE/PR — *Ciclo Econômico, Operacional e Financeiro* (PMR+PME−PMP; benchmarks). https://sebraepr.com.br/comunidade/artigo/ciclo-operacional-financeiro-e-economico
- **[F12]** SEBRAE — *Política de cobrança e controle da inadimplência*. https://sebrae.com.br/sites/PortalSebrae/artigos/politica-de-cobranca-e-controle-da-inadimplencia,91ac438af1c92410VgnVCM100000b272010aRCRD
- **[F13]** SEBRAE — *Diagnóstico de indicadores financeiros* / *Como fazer uma análise financeira*. https://sebrae.com.br/sites/PortalSebrae/sebraeaz/o-que-voce-precisa-saber-sobre-diagnostico-de-indicadores-financeiros,e3eda4670f5bd610VgnVCM1000004c00210aRCRD · https://sebrae.com.br/sites/PortalSebrae/ufs/pr/artigos/como-fazer-uma-analise-financeira,d6b1288acc58d510VgnVCM1000004c00210aRCRD
- **[F14]** SEBRAE — *Guia prático de precificação para os pequenos negócios* (PDF). https://bibliotecas.sebrae.com.br/chronus/ARQUIVOS_CHRONUS/bds/bds.nsf/45ee582085782cbc0f452cce55d360d4/$File/19655.pdf
- **[F15]** DataSebrae — *Inadimplência* (painel de dados). https://datasebrae.com.br/inadimplencia/

**Fontes de método (RAG):**

- **[R1]** *RAG Production Guide 2026* (Lushbinary) — metadados, chunking, citação. https://lushbinary.com/blog/rag-retrieval-augmented-generation-production-guide/
- **[R2]** *RAG Pipeline Deep Dive: Ingestion, Chunking, Embedding, Vector Search* (DEV). https://dev.to/derrickryangiggs/rag-pipeline-deep-dive-ingestion-chunking-embedding-and-vector-search-2877
- **[R3]** *Searching for Best Practices in Retrieval-Augmented Generation* (arXiv 2407.01219). https://arxiv.org/pdf/2407.01219

---

### Camada teórica — referências bibliográficas (obras canônicas citadas em §3)

> Obras de fundamento (livros), sem URL única — referência bibliográfica padrão de Administração:

- Gitman, L. — *Princípios de Administração Financeira*.
- Assaf Neto, A. — *Finanças Corporativas e Valor*.
- Fleuriet, M.; Kehdy, R.; Blanc, G. — *O Modelo Fleuriet*.
- Martins, E. — *Contabilidade de Custos*.
- Kotler, P.; Keller, K. — *Administração de Marketing*; Kotler — *Marketing 4.0*.
- Christensen, C. — *Competing Against Luck* (Jobs To Be Done).
- Porter, M. — *Estratégia Competitiva*; *Vantagem Competitiva*.
- Kim, W.C.; Mauborgne, R. — *A Estratégia do Oceano Azul*.
- Slack, N. et al. — *Administração da Produção*.
- Ries, E. — *A Startup Enxuta (The Lean Startup)*.
- Kaplan, R.; Norton, D. — *Balanced Scorecard*.
- Chiavenato, I. — *Gestão de Pessoas*; Robbins, S. — *Comportamento Organizacional*.
