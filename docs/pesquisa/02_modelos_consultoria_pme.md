# 02 — Modelos de Consultoria Financeira/Administrativa para PME

> **Pesquisa de modelo de negócio — DGR Gestão em Resultado**
> Consultoria administrativa/financeira B2B para PMEs brasileiras faturando até R$ 10 milhões/ano.
> Autor: pesquisa de mercado · **Data de acesso de todas as fontes: 2026-06-29**
> Regra metodológica deste documento: **zero suposição**. Todo número de mercado, preço, benchmark ou afirmação de "o que funciona" carrega fonte (URL + data). Onde não foi possível comprovar com fonte primária, está marcado **NÃO COMPROVADO — validar**.

---

## Sumário executivo

1. **Formato com mais evidência para PME de ticket baixo-médio:** **serviço produtizado em retainer mensal** (escopo fixo, preço fixo, entrega repetível), idealmente combinando **diagnóstico + implementação** e, na faixa superior do ICP, um componente de **CFO fracionado / CFO-as-a-service**. A literatura de productized services e os preços praticados em fractional CFO sustentam esse desenho. (ver §1)
2. **O churn em SMB se concentra nos primeiros 90 dias** (até ~43% das perdas no 1º trimestre; 60–70% do churn total nos primeiros 90 dias). Onboarding rápido e *time-to-value* curto são a alavanca de retenção mais barata. (ver §2)
3. **As metas de unit economics do plano DGR são, em parte, agressivas para o Brasil.** CAC ≤ R$400 e payback ≤ 3 meses são possíveis **só** num modelo de aquisição quase 100% inbound/self-service e ticket recorrente; LTV/CAC ≥ 4, margem ≥ 70% e NRR ≥ 105% são **realistas e alinhados** aos benchmarks. Churn ≤ 5% precisa ser definido como **anual** (mensal seria fora de curva para SMB). (ver §3)
4. **O dado de "21 milhões de PMEs" não se confirma como estoque de empresas;** as fontes SEBRAE apontam ~**24 milhões de pequenos negócios ativos** (incluindo MEI). O "72% WhatsApp" e o "8% automação" **se confirmam em ordem de grandeza** por fontes independentes (CNDL/SPC, RD Station, SEBRAE). O "TAM R$18 bi" **NÃO se confirma** com a definição original. (ver §4)
5. **Implicações para o produto:** a pesquisa exige que a plataforma DGR trate onboarding como produto, instrumente *time-to-value* e *health score*, padronize entregáveis (productize), e estruture o pricing em camadas alinhadas às três faixas do ICP. (ver §6)

**Nº de fontes citadas: 24.**

---

## 1. Formatos de consultoria com evidência de funcionar

### 1.1 Serviço produtizado ("productized service")

Productized consulting = empacotar a expertise em uma oferta padronizada, com **escopo fixo, preço fixo e processo de entrega repetível**, em vez de cobrar por hora ou propor algo customizado a cada cliente [F1][F3][F4].

Evidências/argumentos da literatura:
- Serviços financeiros e de advisory se encaixam bem no modelo, permitindo **serviço mensal de escopo fixo** em vez de hora/ad-hoc [F1].
- Empresas produtizadas tendem a ter **múltiplos de valuation de 6–8× a receita anual**, contra **1–2×** de firmas de serviço tradicionais — porque produtizar reforça receita recorrente, processos documentados, relações transferíveis e escalabilidade [F1]. *(Atenção: número de valuation citado por blog especializado, não por base acadêmica; tratar como indicativo.)*
- Caso citado: firma de advisory que transformou avaliação financeira manual em plataforma digital, reduzindo a entrega de **15 h para 2 h por cliente** e aumentando a capacidade em **300%** [F1]. *(Caso de blog comercial — ilustrativo, NÃO COMPROVADO por fonte independente.)*

**Leitura para a DGR:** o productized service é o casamento natural entre "consultoria" e "plataforma/SaaS" — é o que permite atender PME de ticket baixo com margem e escala. É a tese central do produto.

### 1.2 Retainer mensal vs. hora

No mercado de fractional CFO (proxy mais próximo de "consultoria financeira recorrente para empresa"), o **retainer mensal** emergiu como o modelo preferido para liderança financeira contínua, por dar **custo previsível** aos dois lados e permitir trabalho proativo (não só reativo) [F5][F6].

Preços de referência (mercado dos EUA, 2025 — converter com cautela para o Brasil):
- Hora: **US$175–450/h**, média US$200–350/h [F5][F6].
- Retainer mensal: **US$3.000–15.000/mês**, com a maioria pagando US$5.000–7.500 [F5].
- Fractional CFO custa tipicamente **60–70% menos** que um CFO full-time (US$200k–500k/ano) [F5].

> **Nota de tradução de mercado:** esses preços são de fractional CFO americano e **não se aplicam diretamente** ao ticket DGR (PME até R$10M, ticket baixo-médio). Servem para validar **o desenho** (retainer mensal recorrente), não o valor. Preço-alvo brasileiro: **NÃO COMPROVADO — validar** com pesquisa de disposição a pagar no ICP.

### 1.3 Diagnóstico + implementação

A combinação "diagnóstico que revela o problema + implementação que o resolve" é coerente com **Jobs To Be Done** (Christensen, HBR): o cliente "contrata" o serviço para resolver um *job* concreto (ex.: "parar de misturar conta PJ e PF", "saber se sobra dinheiro no mês"), não para comprar relatórios [F12][F13]. O caso clássico do milkshake mostra que entender o *job* real eleva drasticamente a probabilidade de a oferta vingar [F12].

Para PME brasileira, os *jobs* estão bem evidenciados pelos dados de §4 (61% misturam conta PF/PJ; 25% controlam em caderno; 10% não controlam nada) — ou seja, há *job* doloroso e mensurável que diagnóstico+implementação atacam diretamente [F10][F11].

### 1.4 CFO fracionado / CFO-as-a-service (faixa superior do ICP)

Faz sentido **apenas na faixa superior** do ICP (R$4,8M–10M/ano), onde a empresa já tem complexidade financeira para justificar liderança estratégica recorrente. Para micro e pequena (até R$4,8M), o serviço produtizado de gestão financeira operacional (organização, conciliação, fluxo de caixa, indicadores) é mais aderente que "estratégia de CFO".

**Recomendação de portfólio DGR:**
| Faixa do ICP | Formato recomendado | Justificativa |
|---|---|---|
| Micro (até R$360k) | Productized self-service + onboarding guiado | Ticket muito baixo exige automação quase total |
| Pequena (R$360k–4,8M) | Productized + retainer leve + diagnóstico | Há dor e capacidade de pagar; foco em implementação |
| Faixa superior (R$4,8M–10M) | Retainer + componente CFO fracionado | Complexidade justifica advisory estratégico |

---

## 2. Onboarding, time-to-value, churn e retenção (SMB / B2B ticket baixo-médio)

### 2.1 Churn se concentra no início

- **60–70% de todo o churn acontece nos primeiros 90 dias**; **90% dos usuários** dão churn se não percebem valor **na primeira semana** [F8].
- Especificamente em SMB, **43% de todas as perdas de clientes ocorrem no 1º trimestre** pós-compra [F7][F8].
- Onboarding **incompleto** → **25% de churn em 90 dias**; onboarding **completo** → **8%** [F8].

### 2.2 Time-to-value (TTV)

- Benchmark best-in-class de produtos SaaS: **primeiro valor em 2–5 minutos** [F8].
- Encurtar o TTV de "dias" para "minutos" reduz o churn de 90 dias em **30–50%** [F8].
- Framework de 90 dias em 4 fases: **Ativação (d1–7)**, **Adoção (d8–30)**, **Expansão (d30–60)**, **Retenção (d60–90)** [F8].
- Produtos com onboarding interativo veem **+50% de ativação** e **+70% de retenção** vs. vídeos passivos [F8].

> **Meta DGR TTV ≤ 7 dias:** alinhada e até conservadora frente ao benchmark "valor na 1ª semana". Realista — desde que "valor" seja definido como um *aha moment* concreto (ex.: primeiro fluxo de caixa consolidado entregue), não como "implantação completa".

### 2.3 Retenção e NRR

- NRR best-in-class: **>100% (net negative churn)**; alvo para alto crescimento **≥110%** [F7][F9].
- Para SaaS B2B Brasil, benchmark de NRR: **≥105% (seed)** e **≥115% (Série A)** [F2].

---

## 3. Benchmarks de unit economics (Brasil, ticket baixo-médio) × metas DGR

### 3.1 Benchmarks de mercado coletados

**Churn (SMB / ACV baixo):**
- Mensal SMB: **3–5%** (alguns dizem 3–7%) → equivale a **~31–58% ao ano** [F7].
- Logo churn mensal saudável: enterprise <0,5%; mid-market 0,5–1,5%; **SMB/prosumer 2–4%** [F7].
- Mediana anual de logo churn B2B SaaS: **3,5%**; "bom" é **<5% ao ano** (Recurly 2025) [F7].

**CAC (Brasil, por segmento) [F2]:**
- SaaS B2B **SMB: R$3.000–12.000**; mid-market R$12k–35k; enterprise R$35k–150k.

**LTV/CAC [F2][F14]:**
- Saudável **>3×**; excelente >5×; world-class >8×.

**CAC payback [F2][F14]:**
- Saudável <12m; excelente <6m; world-class <3m. Seed Brasil: <14m.

**Margem bruta [F2]:**
- SaaS B2B saudável: **70%+** (gross margin).

**NRR [F2]:** seed ≥105%; Série A ≥115%.

**NPS [F15]:**
- B2B SaaS mediana ~**41**; "bom" 40–55; top >60. Serviços profissionais/tech podem chegar a 60–66 (Retently 2025).

### 3.2 Tabela comparativa — Meta DGR × Benchmark de mercado × Veredito

| Métrica | Meta DGR | Benchmark de mercado (fonte) | Veredito |
|---|---|---|---|
| **CAC** | ≤ R$400 | SaaS B2B SMB Brasil **R$3.000–12.000** [F2] | **MUITO AGRESSIVA.** R$400 é ~1/8 do piso de mercado. Só viável com aquisição **100% inbound/orgânica/self-service** (sem vendas, sem mídia paga relevante). Tratar R$400 como meta de canal orgânico, não como CAC blended. |
| **CAC payback** | ≤ 3 meses | World-class <3m; saudável <12m; seed Brasil <14m [F2][F14] | **AGRESSIVA (world-class).** Atingível só se ticket mensal recorrente cobre o CAC baixo em 3 cobranças. Coerente **se** CAC ≈ R$400 e ticket ≥ ~R$150/mês com margem alta. Depende inteiramente de bater o CAC. |
| **LTV/CAC** | ≥ 4 | Saudável >3×; excelente >5× [F2][F14] | **REALISTA / SAUDÁVEL.** ≥4 está acima do mínimo e abaixo de world-class. Meta boa. |
| **Margem** | ≥ 70% | SaaS B2B saudável **70%+** [F2] | **REALISTA** para componente SaaS. **Atenção:** a parte "consultoria humana" do serviço tem margem estruturalmente menor; 70% exige que a entrega seja majoritariamente produtizada/automatizada (ver §1.1). |
| **NRR** | ≥ 105% | Seed Brasil ≥105%; Série A ≥115% [F2] | **REALISTA** (nível seed). Exige expansão (upsell/cross-sell) compensando o churn. |
| **Churn** | ≤ 5% | SMB mensal 2–5%; anual "bom" <5% [F7] | **AMBÍGUA → definir.** Se **anual**, é world-class para SMB (difícil, mas meta válida). Se **mensal**, está dentro da faixa SMB (2–5%) e é razoável. **Recomendação: fixar como churn mensal ≤5% no ano 1 e mirar churn anual <15–20%.** |
| **NPS** | ≥ 70 | B2B SaaS "bom" 40–55; top >60; serviços prof. até 66 [F15] | **MUITO AGRESSIVA.** ≥70 está acima de praticamente todos os benchmarks B2B. Excelente como aspiração; **não** usar como gate operacional. Meta realista ano 1: NPS 45–55. |
| **TTV** | ≤ 7 dias | Valor na 1ª semana; best-in-class minutos [F8] | **REALISTA / CONSERVADORA.** Alinhada à literatura. Definir "valor" como *aha moment* concreto. |

**Resumo do veredito:** das 8 metas, **3 são agressivas demais** para o contexto brasileiro de PME (CAC R$400, CAC payback 3m, NPS 70), **4 são realistas/saudáveis** (LTV/CAC, margem, NRR, TTV) e **1 precisa de definição** (churn — mensal vs. anual). As três agressivas só fecham num modelo **predominantemente self-service/inbound e produtizado**; se a DGR depender de venda consultiva humana, CAC e payback estouram.

---

## 4. TAM / SAM / SOM e revalidação dos números do plano original

### 4.1 Revalidação dos números citados no plano

| Afirmação original | Status | Fonte / observação |
|---|---|---|
| **21 milhões de PMEs** | **NÃO CONFIRMADO** (como estoque). SEBRAE aponta **~24 milhões de pequenos negócios ativos** (inclui MEI). O número 21mi não bate com fonte primária; usar **24mi** com a ressalva de que inclui MEI [F16][F17] | Agência SEBRAE / DataSebrae |
| **72% usam WhatsApp** | **CONFIRMADO em ordem de grandeza.** CNDL/SPC: **67%** das empresas de comércio/serviços usam WhatsApp como **principal** canal de venda (amostra 562 empresários, jul/2024) [F18][F19]. RD Station: **~70%** adotaram WhatsApp Business [F20] | CNDL/SPC; RD Station |
| **8% têm automação** | **PLAUSÍVEL / provavelmente otimista demais.** SEBRAE Hábitos Financeiros 2025: só **~20%** usam app/sistema digital; 30% planilha; 25% caderno; 10% nada [F10][F11]. "Automação" plena (não só app) é subconjunto disso → 8% é coerente, mas **fonte exata do 8% NÃO COMPROVADA** | SEBRAE/PR Hábitos Financeiros 2025 |
| **TAM R$18 bi** | **NÃO COMPROVADO.** Mercado de **BPO financeiro** Brasil ~**R$26,8 bi (2024)** e proxy para serviços financeiros terceirizados [F21], mas não corresponde à definição de TAM do plano. Recalcular (§4.3) | HubCount/MaxBPO (mercado adjacente) |

### 4.2 Dados de base validados (fontes SEBRAE/IBGE)

- **~24 milhões de pequenos negócios ativos** no Brasil (inclui MEI) [F16].
- Pequenos negócios = **~95–97% das empresas** ativas e **~26,5% do PIB** [F16][F17].
- **4.158.122 pequenos negócios abertos em 2024** (recorde): 3,09mi MEI + 874,1k ME + 190,5k EPP [F22].
- Renda anual gerada pelos pequenos negócios em 2024: **R$717 bi** (R$224 bi MEI + R$492 bi ME/EPP) [F23].
- **61%** dos donos pagam despesas da empresa com conta pessoal (estável 2023–2025) [F10][F11].
- Controle financeiro: 30% planilha, 25% caderno, **só ~20% app/sistema**, 10% nada [F10][F11].

### 4.3 Recálculo TAM/SAM/SOM (PMEs até R$10M/ano)

**Premissas e ressalvas:** o ICP da DGR (faturamento **até R$10M/ano**, excluindo a maior parte dos MEI que faturam pouco e cujo *job* é diferente) é **menor** que "24mi de pequenos negócios". A definição legal: **microempresa** até R$360k/ano; **EPP/pequena** R$360k–R$4,8M/ano; a faixa R$4,8M–R$10M está acima do teto legal de EPP (R$4,8M) e cai em "média empresa" por receita, embora ainda PME pela ótica de gestão [definições do Simples/Lei Complementar 123 — F22 cita os tetos de R$4,8M para EPP].

> **AVISO:** o número total de empresas **por faixa de faturamento até R$10M** **NÃO foi obtido de fonte primária** nesta pesquisa (exige cruzamento com microdados Receita/IBGE-CEMPRE). O recálculo abaixo é **estrutura + NÃO COMPROVADO** nos valores absolutos; serve de esqueleto para preencher com dado primário.

| Nível | Definição | Estimativa | Status |
|---|---|---|---|
| **TAM** | Todas as empresas formais até R$10M/ano que poderiam usar gestão financeira/administrativa | base: subconjunto dos ~24mi (ME+EPP+parte MEI ativos com faturamento relevante) | **NÃO COMPROVADO — validar com CEMPRE/IBGE + Receita** |
| **SAM** | TAM que tem dor explícita + capacidade de pagar (faixa pequena/superior, ~R$360k–10M) | EPP abertas/ano ≈ 190,5k + estoque de ME com faturamento relevante | **NÃO COMPROVADO — validar** |
| **SOM** | SAM atingível pela DGR em 3 anos dado canal/capacidade | função do CAC e do canal (ver §3) | **NÃO COMPROVADO — definir após validar canal** |

**Segmentação do ICP em faixas (definições legais — validadas via tetos citados por SEBRAE [F22]):**
- **Micro:** até **R$360k/ano**.
- **Pequena (EPP):** **R$360k–R$4,8M/ano**.
- **Faixa superior:** **R$4,8M–R$10M/ano** (já acima do teto de EPP; "média" por receita, mas PME por gestão).

**Proxy de mercado endereçável em R$ (alternativa ao TAM original R$18bi):** mercado de **BPO financeiro** no Brasil ≈ **R$26,8 bi (2024)**, projetado a R$78 bi até 2033 (CAGR 11,7%) [F21] — é o mercado adjacente mais próximo e **mais defensável** que o "R$18 bi" original. Usar como teto superior de TAM de receita, com a ressalva de que inclui clientes acima de R$10M.

---

## 5. Referências de empreendedores brasileiros (contexto, não dado de mercado)

- **Diego Barreto** (VP Finanças/Estratégia iFood), livro *Nova Economia*: tese de que o perfil **empreendedor** substitui o **empresário tradicional**; transparência radical e novos modelos de negócio como fatores de sucesso [F24]. Útil como enquadramento de **posicionamento** da DGR (parceiro de gestão da "nova economia"), não como dado.
- **Tallis Gomes** (G4 Educação; ex-Easy Taxi, Singu): G4 fechou 2023 com ~**R$220 mi** de receita formando empreendedores com conteúdo prático de Vendas/Growth [F25]. Sinaliza apetite de PME brasileira por **educação + execução** em gestão — coerente com o componente "diagnóstico + implementação" da DGR.
- **Flávio Augusto** (Geração de Valor/Wise Up): **NÃO PESQUISADO nesta rodada — validar** se citado como fonte de método. Marcado para próxima iteração.

---

## 6. Implicações para o produto (entregável obrigatório)

O que desta pesquisa **deve virar funcionalidade ou processo** na plataforma DGR:

1. **Onboarding é produto, não suporte.** Construir um fluxo de onboarding em 4 fases (Ativação d1–7 / Adoção d8–30 / Expansão d30–60 / Retenção d60–90), porque 60–70% do churn e 43% das perdas SMB estão nesse intervalo [F8][F7]. → *funcionalidade: wizard de onboarding com checklist e progresso.*
2. **Instrumentar Time-to-Value.** Definir e medir o *aha moment* (ex.: "primeiro fluxo de caixa consolidado entregue") e cravar TTV ≤ 7 dias como SLA de produto, com alerta automático se o cliente não atinge o marco [F8]. → *funcionalidade: tracking de TTV + alerta.*
3. **Health score + intervenção precoce.** Score baseado em frequência de uso, conclusão de onboarding e uso de features; gatilho de CS quando cai. Onboarding incompleto = 25% churn vs. 8% completo [F8]. → *funcionalidade: health score e playbook de retenção.*
4. **Produtizar a entrega (escopo fixo, processo repetível).** Para sustentar margem ≥70% mesmo com componente humano, padronizar entregáveis (diagnóstico, relatórios, conciliação, fluxo de caixa) como "produtos" com SOP — exatamente o que reduziu entrega de 15h→2h no caso citado [F1]. → *processo: catálogo de entregáveis padronizados + automação dos repetitivos (alinha com a arquitetura Claude Code-cêntrica do doc 00).*
5. **Pricing em 3 camadas alinhado ao ICP.** Self-service (micro) / produtizado+retainer leve (pequena) / retainer+CFO fracionado (faixa superior). Retainer mensal recorrente é o modelo com evidência de preferência e previsibilidade [F5][F6]. → *funcionalidade: planos por faixa.*
6. **Aquisição inbound/orgânica como default.** As metas CAC ≤R$400 e payback ≤3m só fecham sem venda consultiva cara; priorizar canais orgânicos e **WhatsApp** (67–70% das PMEs já usam como canal principal) [F18][F20]. → *funcionalidade: entrada/onboarding via WhatsApp; conteúdo orgânico.*
7. **Atacar o *job* dolorosos comprovados.** 61% misturam conta PF/PJ; 35% controlam em caderno/nada [F10][F11]. A primeira feature de valor deve resolver explicitamente "separar e enxergar o caixa". É o milkshake JTBD da PME brasileira [F12]. → *funcionalidade: separação PF/PJ + visão de caixa como primeiro entregável.*
8. **Expansão embutida (para NRR ≥105%).** Desenhar upsell/cross-sell natural (módulos fiscal, controladoria, RH) para que a base se expanda e compense churn [F2]. → *funcionalidade: módulos add-on.*
9. **Recalibrar metas no plano.** Trocar "NPS ≥70" por meta escalonada (45–55 ano 1) e **definir churn como mensal ≤5%**; documentar CAC R$400 como meta de canal orgânico, não blended [F7][F15].

---

## Fontes

Todas acessadas em **2026-06-29**.

- [F1] Bennett Financials — *How to Productize Consulting Services: A Financial Planning Guide.* https://bennettfinancials.com/productizing-services-coaching-consulting/
- [F3] Melisa Liberman — *Productized Consulting 101.* https://www.melisaliberman.com/blog/productized-consulting
- [F4] ManyRequests — *Productized Consulting: How to Package & Scale Services in 2026.* https://www.manyrequests.com/blog/productized-consulting
- [F5] Madras Accountancy — *Fractional CFO Services Pricing Models.* https://madrasaccountancy.com/blog-posts/fractional-cfo-services-pricing-models-complete-guide-to-hourly-rates-cost-structure
- [F6] The Expert CFO — *Monthly Retainers vs Hourly Rates: Which Fractional CFO Pricing Model Saves You More?* https://theexpertcfo.com/monthly-retainers-vs-hourly-rates-fractional-cfo/
- [F2] Baita — *Benchmarks SaaS B2B Brasil 2026: CAC, LTV, NRR, Churn, Magic Number.* https://baita.ac/tudo-sobre/benchmarks-saas
- [F7] Optifai — *B2B SaaS Churn Rate Benchmarks (939 Companies by Segment & ACV).* https://optif.ai/learn/questions/b2b-saas-churn-rate-benchmark/
- [F8] Arcade — *Customer Onboarding Best Practices for SaaS in 2026.* https://www.arcade.software/post/customer-onboarding-best-practices
- [F9] Ever-Help — *The 2026 SaaS retention benchmarks every founder should know.* https://www.ever-help.com/blog/saas-retention-rate-benchmarks
- [F10] Revista Kdea 360 — *Digitalização financeira: 70% das microempresas priorizam gestão automatizada em 2026* (cita SEBRAE Hábitos Financeiros: 30% planilha, 25% caderno, 20% app, 10% nada). https://revistakdea360.com.br/noticia/48910/digitalizacao-financeira-70-das-microempresas-priorizam-gestao-automatizada-em-2026
- [F11] SEBRAE/PR — *Pesquisa Hábitos Financeiros 2025: Como Os Pequenos Negócios Tomam Decisões.* https://sebraepr.com.br/impulsiona/habitosfinanceiro2025/
- [F12] HBS Library — *Clay Christensen's Milkshake Marketing.* https://www.library.hbs.edu/working-knowledge/clay-christensens-milkshake-marketing
- [F13] HBR — *The "Jobs to be Done" Theory of Innovation* (podcast). https://hbr.org/podcast/2016/12/the-jobs-to-be-done-theory-of-innovation
- [F14] Airtree Ventures — *CAC Payback and LTV/CAC Ratio.* https://www.airtree.vc/open-source-vc/startup-metrics-cac-payback-and-ltv-cac-ratio
- [F15] CustomerGauge — *NPS SaaS Net Promoter Score Benchmarks (2025).* https://customergauge.com/benchmarks/blog/nps-saas-net-promoter-score-benchmarks
- [F16] Agência SEBRAE de Notícias — *Pequenos negócios somam 24 milhões de empresas ativas.* https://agenciasebrae.com.br/dados/pequenos-negocios-somam-24-milhoes-de-empresas-ativas/
- [F17] SEBRAE — *Micro e pequenas empresas geram 27% do PIB do Brasil.* https://sebrae.com.br/sites/PortalSebrae/ufs/mt/noticias/micro-e-pequenas-empresas-geram-27-do-pib-do-brasil,ad0fc70646467410VgnVCM2000003c74010aRCRD
- [F18] CNDL/SPC Brasil — *67% das empresas vendem principalmente pelo WhatsApp* (amostra 562, jul/2024). https://site.cndl.org.br/67-das-empresas-vendem-principalmente-pelo-whatsapp-aponta-pesquisa-cndlspc-brasil/
- [F19] Varejo S.A. (CNDL) — *67% das empresas vendem principalmente pelo WhatsApp.* https://cndl.org.br/varejosa/67-das-empresas-vendem-principalmente-pelo-whatsapp-aponta-pesquisa-cndl-spc-brasil/
- [F20] Jornal Visão de Negócios — *Sete em cada dez empresas brasileiras já usam WhatsApp Business para vender* (cita RD Station Panorama 2024). https://jornalvisaodenegocios.com.br/sete-em-cada-dez-empresas-brasileiras-ja-usam-whatsapp-business-para-vender/
- [F21] HubCount / MaxBPO — *Mercado de BPO Financeiro no Brasil (~R$26,8 bi em 2024, CAGR 11,7% até R$78 bi 2033).* https://maxbpo.com.br/o-crescimento-acelerado-do-bpo-financeiro-no-brasil-eficiencia-e-digitalizacao-em-foco/
- [F22] Agência SEBRAE de Notícias — *Recorde histórico! Mais de 4,15 milhões de pequenos negócios foram abertos em 2024* (MEI/ME/EPP e tetos de faturamento). https://agenciasebrae.com.br/economia-e-politica/recorde-historico-mais-de-415-milhoes-de-pequenos-negocios-foram-abertos-em-2024/
- [F23] Agência SEBRAE de Notícias — *Renda anual gerada pelos pequenos negócios chega a R$ 717 bilhões em 2024.* https://agenciasebrae.com.br/dados/renda-anual-gerada-pelos-pequenos-negocios-chega-a-r-717-bilhoes-em-2024/
- [F24] Amazon Brasil — Diego Barreto, *Nova Economia* (ficha do livro). https://www.amazon.com.br/Nova-Economia-empreendedor-tradicional-brasileiro/dp/6555441038
- [F25] G4 Business — *Tallis Gomes: História e Biografia* (G4 Educação ~R$220mi receita 2023). https://g4business.com/biografias/tallis-gomes

---

### Itens marcados NÃO COMPROVADO (para próxima rodada de validação)
1. Valor de TAM/SAM/SOM **em número de empresas por faixa de faturamento até R$10M** → exige microdados IBGE-CEMPRE / Receita Federal.
2. **Preço-alvo brasileiro** (disposição a pagar) do retainer DGR por faixa → pesquisa primária no ICP.
3. Fonte exata do **"8% automação"** original.
4. Casos de valuation 6–8× e do "15h→2h" (blogs comerciais) → buscar fonte independente.
5. **Flávio Augusto** como referência de método → não pesquisado nesta rodada.
