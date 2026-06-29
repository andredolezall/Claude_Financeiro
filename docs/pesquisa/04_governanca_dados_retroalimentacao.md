# 04 — Governança de Dados e Retroalimentação entre Empresas (DG / DGR)

**Documento:** Governança de dados, privacidade e parâmetros para a "retroalimentação entre empresas" do DG
**Responsável:** Governança de Dados e Privacidade — DGR Gestão em Resultado
**Plataforma:** B2B, dado financeiro sensível de PMEs, sujeita à LGPD (Lei 13.709/2018)
**Data de elaboração / data de acesso de todas as fontes:** 2026-06-29
**Versão:** 1.0

> **REGRA DE OURO DESTE DOCUMENTO — ZERO SUPOSIÇÃO.**
> Cada parâmetro abaixo é lastreado em documentação **oficial** das empresas de IA (URL + data de acesso 2026-06-29) ou no texto oficial da LGPD (Planalto). Onde a fonte oficial **não** confirma explicitamente um ponto, ele está marcado como **"NÃO COMPROVADO — validar"**.
> Observação metodológica: nas consultas de 2026-06-29, o acesso direto via fetch às páginas oficiais retornou bloqueio anti-bot (HTTP 403) em openai.com, anthropic.com, x.ai e support.google.com. O conteúdo citado foi extraído via busca indexada dessas mesmas páginas oficiais. **Antes de uso jurídico/contratual, revalidar cada citação abrindo a URL no navegador.**

---

## Sumário

As quatro grandes provedoras de IA convergem em um mesmo padrão de governança que serve de lastro direto para o DG:

1. **Tratamento diferenciado consumidor vs. business/API.** No consumidor (ChatGPT grátis, Gemini Apps, Grok, Claude Free/Pro/Max) o uso de conversas para treino é **o padrão** (opt-out na OpenAI/Google/xAI; e, desde 2025, uma escolha obrigatória na Anthropic). Já em **business/enterprise/API** o padrão se inverte: **por padrão NÃO se treina** com os dados do cliente — OpenAI, Google Workspace, xAI Enterprise e Anthropic Commercial Terms são explícitos nesse sentido. Para o DG, que é B2B com dado financeiro sensível, o regime relevante é o de **business/API: excluído do treino por padrão, opt-in explícito**.

2. **De-identificação / remoção de PII antes de qualquer camada compartilhada.** Todas declaram reduzir/remover dados pessoais e/ou agregar/anonimizar antes de treinar ou compartilhar: OpenAI "reduz a quantidade de informação pessoal" e "agrega ou de-identifica"; Google "desconecta da conta" e "reduz informação pessoal" antes da revisão; Anthropic "desassocia inputs/outputs do user ID" e "filtra ou ofusca dados sensíveis"; xAI cria "dados de-identificados e/ou agregados".

3. **Aprendizado offline, em lote, com curadoria humana** — não há "aprendizado ao vivo" sobre conversas individuais; há revisão de subconjuntos e pipelines separados de treino.

4. **Retenção e reversibilidade definidas e versionadas** (ex.: API OpenAI 30 dias / Zero Data Retention; Anthropic 30 dias vs. 5 anos se opt-in; Google 3 anos para dados revisados).

Os **6 parâmetros de governança DGR** ao final traduzem essas práticas em regras de produto, cada uma com prática-base, fonte oficial e plano de implementação, ancorados nos arts. 6º, 7º, 8º e 12 da LGPD.

---

## 1. OpenAI (ChatGPT / API)

### 1.1 Padrão consumidor (ChatGPT grátis/Plus)
- ChatGPT é melhorado treinando-se nas conversas das pessoas, **a menos que o usuário faça opt-out**. Citação oficial: *"ChatGPT improves by further training on the conversations people have with it, unless you opt out."*
- **Mecanismo de opt-out:** Settings > Data Controls > "Improve the model for everyone" (toggle); ou via Privacy Portal; ou usando "Temporary Chat" (não entra no histórico nem no treino).
- **Ressalva:** se o usuário opta por sair do treino mas envia feedback (thumbs up/down), a conversa associada ao feedback **pode** ser usada para treino.
- **Modelo:** consumidor = **opt-out** (treino é o default).

### 1.2 Padrão business / Enterprise / API (regime relevante para o DG)
- Citação oficial: *"By default, OpenAI does not use data from ChatGPT Enterprise, ChatGPT Business, ChatGPT Edu, ChatGPT for Healthcare, ChatGPT for Teachers, or the API platform—including inputs or outputs—for training or improving its models."*
- API desde **01/03/2023**: dados enviados à API **não** são usados para treinar/melhorar modelos, **salvo opt-in explícito**. *"unless you explicitly opt-in, organizations are opted out of data-sharing by default."*
- **Modelo:** business/API = **opt-in** (exclusão do treino é o default). É exatamente o regime que o DG deve adotar.

### 1.3 De-identificação / remoção de PII
- Citação oficial: *"OpenAI ... takes steps to reduce the amount of personal information in training datasets before they are used to improve and train models."*
- Citação oficial: *"OpenAI aggregates or de-identifies Personal Data so that it no longer identifies individuals"* antes de compartilhar com terceiros para fins de melhoria dos serviços.

### 1.4 Retenção
- **API (default):** logs de monitoramento de abuso retidos por **até 30 dias** (podem conter prompts/respostas e metadados), salvo exigência legal.
- **Zero Data Retention (ZDR):** clientes elegíveis e aprovados podem ter o conteúdo **não retido** ("we never retain the prompts you send or the answers we return").
- **Modified Abuse Monitoring:** exclui o conteúdo do cliente dos logs de abuso, mantendo a plataforma.

**Fontes OpenAI:**
- https://openai.com/enterprise-privacy/ (acesso 2026-06-29)
- https://help.openai.com/en/articles/5722486-how-your-data-is-used-to-improve-model-performance (acesso 2026-06-29)
- https://openai.com/policies/how-your-data-is-used-to-improve-model-performance/ (acesso 2026-06-29)
- https://openai.com/business-data/ (acesso 2026-06-29)
- https://developers.openai.com/api/docs/guides/your-data (acesso 2026-06-29)
- https://openai.com/policies/us-privacy-policy/ (acesso 2026-06-29)
- https://openai.com/index/response-to-nyt-data-demands/ (acesso 2026-06-29)

---

## 2. Google (Gemini / Workspace)

### 2.1 Padrão consumidor (Gemini Apps)
- Subconjunto de conversas é revisado por humanos e usado para melhorar serviços Google, incluindo os modelos do Gemini. Citação oficial: *"a subset of chats are reviewed by human reviewers to help improve Google services, including Gemini models ..."*
- **Aviso oficial:** Google recomenda **não inserir informação confidencial** que o usuário não queira que um revisor veja ou que o Google use para melhorar serviços.
- **De-identificação na revisão (consumidor):** *"before trained service providers review interactions ... Google takes steps to protect privacy, such as disconnecting interactions from your Google Account and reducing personal information in this data"* e *"data reviewed by service providers is disconnected from your account and saved for 3 years."*
- **Opt-out:** desligar a configuração "Keep Activity" interrompe a revisão de chats futuros para melhoria.
- **Retenção:** chats revisados retidos por **até 3 anos** (desconectados da conta).
- **Modelo:** consumidor = **opt-out**.

### 2.2 Padrão Workspace / Enterprise (regime análogo ao DG)
- Citação oficial: *"Google does not use customers' Workspace data to train or improve the underlying generative AI and large language models (LLMs) that power Gemini, Search, and other systems outside of Workspace without permission."*
- Citação oficial: *"Your content is not reviewed by humans or otherwise used for Gemini model training outside your domain without permission."*
- **Isolamento entre clientes/usuários:** *"Your data—including prompts, outputs, and training—isn't used to train Google models or models for any other customer."* O modelo "não permite que inputs ou conteúdo de sessão vazem entre fronteiras de usuário".
- **Modelo:** enterprise = **não treina por padrão; sem revisão humana; sem vazamento entre tenants**. Forte lastro para o requisito de isolamento entre empresas do DG.

**Fontes Google:**
- https://support.google.com/gemini/answer/13594961 (Gemini Apps Privacy Hub; acesso 2026-06-29)
- https://workspace.google.com/security/ai-privacy/ (acesso 2026-06-29)
- https://knowledge.workspace.google.com/admin/generative-ai/generative-ai-in-google-workspace-privacy-hub (acesso 2026-06-29)
- https://knowledge.workspace.google.com/admin/gemini/gemini-for-google-workspace-faq (acesso 2026-06-29)
- https://support.google.com/a/answer/16479199 (Control Gemini Business and Enterprise access; acesso 2026-06-29)

---

## 3. xAI (Grok)

### 3.1 Padrão consumidor (Grok app / web / Grok no X)
- Citação oficial: *"xAI may use your content and interactions with Grok (e.g., prompts, searches, and other materials you submit) along with Grok's responses to train their models ..."*
- **Opt-out:** Grok app: Settings > Data Controls > desmarcar "Improve the model"; Grok web: Settings > Data; Grok no X: Settings > Privacy & Safety > Data sharing > Grok. **"Private Chat"** não é usado para treino.
- **Ressalva:** feedback (thumbs up/down) pode ser usado para treinar/afinar o Grok mesmo após opt-out.
- **OAuth Google:** conteúdo de Google Apps conectado via OAuth **não** é usado para treino.
- **Modelo:** consumidor = **opt-out**.

### 3.2 Padrão Enterprise / API (regime relevante para o DG)
- Citação oficial (Enterprise ToS): *"xAI shall not use any User Content to train any foundation models, large language models, or other artificial intelligence systems."*
- Grok Business/Enterprise: *"your data stays yours: no training on it, ever."*
- **Voice API:** áudio processado em tempo real, **nunca armazenado nem usado para treino**.
- **Collections API:** dados não usados para treino salvo consentimento do usuário.

### 3.3 De-identificação / dados agregados
- Cláusula oficial: xAI *"may create de-identified and/or aggregated data derived from Customer's use of the Services, and may use De-Identified Data for any lawful purpose, including maintaining or improving the Services ... benchmarking, and other business purposes."*
- **Leitura para o DG:** mesmo o provedor que "nunca treina com conteúdo do cliente" reserva-se o uso de **dados de-identificados e/ou agregados** — exatamente o tipo de dado que o DG pretende trafegar na camada compartilhada.
- **Retenção/PII no enterprise:** **NÃO COMPROVADO — validar** (prazos específicos de retenção enterprise não confirmados na consulta).

**Fontes xAI:**
- https://x.ai/legal/privacy-policy (acesso 2026-06-29)
- https://x.ai/legal/terms-of-service-enterprise (acesso 2026-06-29)
- https://x.ai/legal/faq (acesso 2026-06-29)
- https://x.ai/news/grok-business (Introducing Grok Business and Grok Enterprise; acesso 2026-06-29)
- https://x.ai/api (acesso 2026-06-29)

---

## 4. Anthropic (Claude)

### 4.1 Padrão consumidor (Free / Pro / Max) — atualização de 2025
- Em 2025 a Anthropic passou a **exigir uma escolha** do usuário sobre uso dos dados para melhoria do Claude. Citação oficial: usuários existentes têm **até 08/10/2025** para aceitar os termos atualizados e fazer a escolha; após essa data, é preciso definir a configuração para continuar usando o Claude.
- **Retenção condicionada à escolha:** se o usuário **permite** o uso para melhoria, a retenção vai para **5 anos** (apenas para chats novos/retomados); se **não** permite, mantém-se a retenção de **30 dias**.
- **Escopo:** aplica-se a Free, Pro e Max (incl. Claude Code dessas contas). **Não** se aplica aos serviços sob Commercial Terms.
- **Modelo:** consumidor = **escolha obrigatória** (opt-in/opt-out explícito na ativação).

### 4.2 Padrão Commercial / API / Enterprise (regime relevante para o DG)
- Citação oficial: *"By default, Anthropic will not use inputs or outputs from its commercial products (e.g. Claude for Work, Anthropic API, Claude Gov, etc.) to train its models."*
- Não se aplica ao Commercial Terms: *"... do not apply to services under Commercial Terms like Claude for Work, Claude for Government, Claude for Education, or API use."*
- Exceção apenas por **opt-in explícito** (ex.: Development Partner Program, com opt-in expresso pelo admin da organização).
- **Modelo:** commercial/API = **opt-in** (exclusão do treino é o default).

### 4.3 De-identificação / remoção de PII
- Citação oficial: *"Anthropic uses a combination of tools and automated processes to filter or obfuscate sensitive data."*
- Citação oficial: *"When you submit feedback, Anthropic disassociates inputs and outputs from your user ID to use them for training and improving their models."* / *"they de-link your feedback from your user ID (e.g. email address) before it's used."*
- Citação oficial: *"Anthropic may process personal data in an aggregated or de-identified form to ... train their AI models as permitted under applicable laws."*

### 4.4 Retenção
- Se opt-in para melhoria: dados retidos em **formato de-identificado por até 5 anos** nos pipelines de treino.
- Feedback (thumbs up/down, bug reports): retido por **5 anos**, desvinculado do user ID, **não combinado** com as demais conversas.
- Padrão sem opt-in: **30 dias**.
- Dados anonimizados/de-identificados para pesquisa/estatística podem ser retidos por mais tempo; quando não mais necessários, são destruídos/deletados/anonimizados.

**Fontes Anthropic:**
- https://www.anthropic.com/news/updates-to-our-consumer-terms (acesso 2026-06-29)
- https://privacy.anthropic.com/en/articles/7996868-i-want-to-opt-out-of-my-prompts-and-results-being-used-for-training-models (acesso 2026-06-29)
- https://privacy.anthropic.com/en/articles/10023548-how-long-do-you-store-personal-data (acesso 2026-06-29)
- https://privacy.anthropic.com/en/articles/9957937-how-does-anthropic-use-submitted-feedback (acesso 2026-06-29)
- https://privacy.anthropic.com/en/articles/10458704-how-does-anthropic-protect-the-personal-data-of-claude-ai-users (acesso 2026-06-29)
- https://www.anthropic.com/product/enterprise (acesso 2026-06-29)
- https://docs.anthropic.com/en/docs/claude-code/data-usage (acesso 2026-06-29)

---

## 5. Tabela comparativa

| Provedor | Treino no **consumidor** | Treino em **business/enterprise/API** (padrão) | Opt-in vs opt-out (business) | Retenção | De-identificação / PII |
|---|---|---|---|---|---|
| **OpenAI** | Sim, salvo opt-out | **Não** treina por padrão (Enterprise/Business/Edu/API) | **Opt-in** explícito | API: 30 dias (logs de abuso); ZDR = não retém | "Reduz informação pessoal" antes de treinar; "agrega ou de-identifica" antes de compartilhar |
| **Google** | Sim (subconjunto revisado), salvo desligar "Keep Activity" | **Não** treina Workspace data sem permissão; sem revisão humana; sem vazamento entre tenants | **Permissão** explícita (opt-in) | Consumidor revisado: 3 anos (desconectado da conta) | Desconecta da conta + reduz info pessoal antes da revisão |
| **xAI** | Sim, salvo opt-out / Private Chat | **Não** treina User Content "ever" (Enterprise ToS) | **Consentimento** explícito (opt-in) | Voice: não armazena; demais enterprise: **NÃO COMPROVADO — validar** | Pode criar dados **de-identificados e/ou agregados** para fins lícitos |
| **Anthropic** | Escolha obrigatória (opt-in/opt-out na ativação, desde 2025) | **Não** usa inputs/outputs de produtos comerciais por padrão | **Opt-in** explícito (ex.: Dev Partner Program) | 30 dias (default) / 5 anos (se opt-in) / feedback 5 anos | Filtra/ofusca dados sensíveis; desassocia inputs/outputs do user ID |

**Conclusão da tabela:** o padrão de mercado para o regime B2B/enterprise (o do DGR) é **não treinar por padrão + opt-in explícito + de-identificação/agregação + retenção definida**. Os 6 parâmetros abaixo formalizam esse padrão para o DG.

---

## 6. Parâmetros de Governança da DGR (lastro para a "retroalimentação entre empresas" do DG)

Premissa de produto: a retroalimentação do DG **não** é aprendizado ao vivo. É um **job offline, em lote, com curadoria**, que extrai "aprendizados" agregados/anonimizados de múltiplos tenants para uma camada compartilhada — nunca expondo dado de um cliente a outro.

### Parâmetro 1 — Não é aprendizado ao vivo: retroalimentação por job offline em lote, com curadoria
- **Prática-base:** nenhuma das grandes faz "aprendizado ao vivo" da conversa individual; usam **revisão de subconjuntos** e **pipelines de treino separados**. Google revisa "a subset of chats" via revisores treinados; Anthropic mantém pipelines de treino próprios e desvincula feedback; OpenAI treina em datasets preparados, não no fluxo.
- **Fonte:** Google — https://support.google.com/gemini/answer/13594961 ; Anthropic — https://privacy.anthropic.com/en/articles/9957937-how-does-anthropic-use-submitted-feedback (acesso 2026-06-29).
- **Implementação na DGR:**
  - Pipeline `dg-retroalimentacao` agendado (ex.: batch noturno/semanal), desacoplado do runtime do produto. Nada do que um tenant faz altera o modelo compartilhado em tempo real.
  - Estágio obrigatório de **curadoria** (humana + regras) antes de qualquer item entrar na camada de aprendizados.
  - Logs imutáveis de cada execução (input do job, regras aplicadas, itens aprovados/rejeitados).

### Parâmetro 2 — Dado de cliente business excluído por padrão (opt-in explícito, não opt-out) — flag de consentimento por tenant
- **Prática-base:** em business/API, OpenAI ("does not use ... API ... for training ... unless you explicitly opt-in"), Google ("not used ... without permission"), xAI Enterprise ("shall not use any User Content to train") e Anthropic ("will not use inputs or outputs from its commercial products to train ... by default") **excluem o cliente do treino por padrão** e só incluem por **opt-in explícito**.
- **Fonte:** OpenAI — https://openai.com/enterprise-privacy/ ; Anthropic — https://privacy.anthropic.com/en/articles/7996868 ; xAI — https://x.ai/legal/terms-of-service-enterprise ; Google — https://workspace.google.com/security/ai-privacy/ (acesso 2026-06-29).
- **Implementação na DGR:**
  - Flag por tenant `consent_retroalimentacao = false` por **padrão**. Sem opt-in expresso (registrado, datado, com identificação de quem consentiu pela empresa), os dados do tenant **nunca** entram no job do Parâmetro 1.
  - Consentimento **específico e por finalidade** (LGPD art. 8º, §4º: autorizações genéricas são nulas), revogável a qualquer tempo de forma fácil.
  - Trilha de auditoria do consentimento (versão dos termos aceitos, timestamp, usuário responsável).

### Parâmetro 3 — De-identificação / remoção de PII antes da camada compartilhada (sem nome, CNPJ, valores absolutos, contrapartes)
- **Prática-base:** OpenAI "reduz a quantidade de informação pessoal antes do treino" e "agrega ou de-identifica"; Google "desconecta da conta e reduz informação pessoal" antes da revisão; Anthropic "filtra ou ofusca dados sensíveis" e "desassocia inputs/outputs do user ID"; xAI cria "dados de-identificados e/ou agregados".
- **Fonte:** OpenAI — https://openai.com/policies/us-privacy-policy/ ; Google — https://support.google.com/gemini/answer/13594961 ; Anthropic — https://privacy.anthropic.com/en/articles/10458704 ; xAI — https://x.ai/legal/terms-of-service-enterprise (acesso 2026-06-29).
- **Implementação na DGR:**
  - Camada de transformação obrigatória que **remove/oculta**: razão social e nomes, CNPJ/CPF, contrapartes (clientes/fornecedores nominais), números de documento, e **valores absolutos** (substituídos por faixas, índices, normalizações ou variações percentuais).
  - Desvinculação do `tenant_id` antes de qualquer mesclagem (espelha o "disassociate from user ID" da Anthropic / "disconnect from account" do Google).
  - O dado só é promovido para a camada compartilhada **após** passar por esse estágio; nada de PII atravessa a fronteira do tenant.

### Parâmetro 4 — Só trafega agregado/anonimizado, com limiar mínimo N ≥ X empresas distintas (anti-reidentificação)
- **Prática-base:** as provedoras trafegam **dados agregados/de-identificados** para fins de melhoria (OpenAI "aggregates or de-identifies"; xAI "aggregated data ... for ... improving the Services"). O conceito de anonimização robusta exige que não seja razoavelmente reversível (ver LGPD art. 12).
- **Fonte:** OpenAI — https://openai.com/policies/us-privacy-policy/ ; xAI — https://x.ai/legal/terms-of-service-enterprise (acesso 2026-06-29); LGPD art. 12 — http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm (acesso 2026-06-29).
- **Implementação na DGR:**
  - Regra de **k-anonimato**: nenhum "aprendizado" agregado é publicado na camada compartilhada se for derivado de menos de **N ≥ X empresas distintas** (definir X em política — recomendação de partida: **X = 5**; **NÃO COMPROVADO — validar** com jurídico/DPO o valor mínimo adequado ao risco do dado financeiro).
  - Supressão de células/segmentos que individualizem um tenant; bloqueio de combinações de atributos que permitam reidentificação por inferência (perfil comportamental também é dado pessoal — art. 12, §2º).
  - Teste automatizado de reidentificação no pipeline antes do publish.

### Parâmetro 5 — Camada de "aprendizados" separada, curada, versionada e auditável
- **Prática-base:** Google mantém **isolamento entre tenants** ("isn't used to train ... models for any other customer"; sem vazamento entre fronteiras de usuário) e revisão por equipe; Anthropic mantém pipeline de treino segregado e desvinculado. Ou seja, o que volta ao "compartilhado" é uma camada **separada e controlada**, não a soma crua das conversas.
- **Fonte:** Google — https://workspace.google.com/security/ai-privacy/ ; Anthropic — https://privacy.anthropic.com/en/articles/9957937 (acesso 2026-06-29).
- **Implementação na DGR:**
  - Repositório de "aprendizados" **fisicamente/logicamente separado** dos dados operacionais dos tenants, com controle de acesso próprio.
  - **Versionamento** (cada release de aprendizados tem ID, changelog, conjunto-fonte agregado, regras aplicadas) e **auditabilidade** (quem aprovou, quando, com base em quê).
  - Curadoria obrigatória: nenhum aprendizado entra sem revisão; capacidade de **rollback** de uma versão.

### Parâmetro 6 — Retenção, deleção e reversibilidade
- **Prática-base:** retenções definidas e diferenciadas por regime — OpenAI API 30 dias / ZDR (não retém); Anthropic 30 dias (default) vs. 5 anos (opt-in), com deleção/anonimização ao fim; Google 3 anos para dados revisados desconectados da conta.
- **Fonte:** OpenAI — https://developers.openai.com/api/docs/guides/your-data ; Anthropic — https://privacy.anthropic.com/en/articles/10023548 ; Google — https://support.google.com/gemini/answer/13594961 (acesso 2026-06-29).
- **Implementação na DGR:**
  - Política de retenção **explícita e por finalidade**: dado operacional do tenant com prazo curto; agregados anonimizados podem ser retidos por mais tempo (alinhado ao art. 16 da LGPD e ao tratamento de dado anonimizado do art. 12).
  - **Reversibilidade do consentimento (Parâmetro 2):** ao revogar, o tenant deixa de alimentar jobs futuros; e há processo para expurgar contribuições ainda identificáveis. Observação: aprendizados **já anonimizados e agregados** (≥ N empresas, sem reversibilidade razoável) deixam de ser dado pessoal (art. 12) e podem permanecer — isso deve constar no termo de consentimento.
  - Rotina de **deleção/expurgo** auditável e SLA de atendimento a titulares (LGPD arts. 18–20).

---

## 7. LGPD (Lei nº 13.709/2018) — base legal aplicável

> Fonte oficial única desta seção: **Planalto** — http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm (acesso 2026-06-29).

- **Art. 12 — Anonimização (núcleo da camada compartilhada do DG).** Dados anonimizados **não** são considerados dados pessoais, *exceto* quando o processo de anonimização for revertido (por meios próprios) ou puder ser revertido com esforços razoáveis. O "razoável" considera fatores objetivos: custo e tempo para reverter, tecnologias disponíveis. **§2º:** dados usados para formar **perfil comportamental** de pessoa natural, se identificada, são dados pessoais. **Consequência para o DG:** os Parâmetros 3 e 4 (de-identificação + limiar N ≥ X) são o que faz o dado da camada compartilhada **deixar de ser dado pessoal** — desde que a reidentificação não seja razoavelmente possível. Sem isso, continua sendo dado pessoal e exige base legal e todas as garantias.

- **Art. 6º — Princípios.** Aplicam-se especialmente: **finalidade** (uso para propósitos específicos e informados), **adequação**, **necessidade / minimização** (limitar ao mínimo necessário — lastro direto do Parâmetro 3), **segurança**, **prevenção**, **não discriminação** e **responsabilização e prestação de contas** (lastro do Parâmetro 5 — auditabilidade/versionamento).

- **Art. 7º — Bases legais.** Para a retroalimentação, a base recomendada é o **consentimento (art. 7º, I)** do tenant, materializado no opt-in do Parâmetro 2. (O art. 7º, IV trata de estudos por órgão de pesquisa com anonimização sempre que possível — referência conceitual, não base direta para uso comercial do DGR.) **NÃO COMPROVADO — validar** com DPO se há cabimento de **legítimo interesse (art. 7º, IX)** para a etapa já anonimizada; recomendação conservadora: ancorar tudo em consentimento + anonimização (art. 12).

- **Art. 8º — Consentimento.** Deve ser por escrito ou meio que demonstre a manifestação de vontade, **referido a finalidades determinadas** (autorizações genéricas são **nulas** — §4º) e **revogável a qualquer tempo** por procedimento gratuito e facilitado (§5º). Embasa diretamente a flag de consentimento por tenant e a reversibilidade (Parâmetros 2 e 6).

- **Arts. 15–16 — Término do tratamento e retenção.** Eliminação dos dados ao fim da finalidade, ressalvadas hipóteses legais; embasa o Parâmetro 6.

- **Arts. 18–20 — Direitos do titular.** Acesso, correção, anonimização/eliminação, portabilidade, revisão de decisões automatizadas — o produto deve ter processo para atendê-los.

- **Atenção (dado financeiro de PME):** dado financeiro de empresa, quando vinculável a pessoa natural (sócio, MEI, perfil comportamental), pode ser **dado pessoal**. Por prudência, o DG trata todo o fluxo de retroalimentação sob regime de dado pessoal **até** a anonimização do art. 12.

---

## 8. Fontes (URLs + data de acesso 2026-06-29)

**OpenAI (oficial):**
- https://openai.com/enterprise-privacy/
- https://openai.com/business-data/
- https://openai.com/policies/how-your-data-is-used-to-improve-model-performance/
- https://openai.com/policies/us-privacy-policy/
- https://openai.com/index/response-to-nyt-data-demands/
- https://help.openai.com/en/articles/5722486-how-your-data-is-used-to-improve-model-performance
- https://developers.openai.com/api/docs/guides/your-data

**Google (oficial):**
- https://support.google.com/gemini/answer/13594961 (Gemini Apps Privacy Hub)
- https://workspace.google.com/security/ai-privacy/
- https://knowledge.workspace.google.com/admin/generative-ai/generative-ai-in-google-workspace-privacy-hub
- https://knowledge.workspace.google.com/admin/gemini/gemini-for-google-workspace-faq
- https://support.google.com/a/answer/16479199

**xAI (oficial):**
- https://x.ai/legal/privacy-policy
- https://x.ai/legal/terms-of-service-enterprise
- https://x.ai/legal/faq
- https://x.ai/news/grok-business
- https://x.ai/api

**Anthropic (oficial):**
- https://www.anthropic.com/news/updates-to-our-consumer-terms
- https://privacy.anthropic.com/en/articles/7996868-i-want-to-opt-out-of-my-prompts-and-results-being-used-for-training-models
- https://privacy.anthropic.com/en/articles/10023548-how-long-do-you-store-personal-data
- https://privacy.anthropic.com/en/articles/9957937-how-does-anthropic-use-submitted-feedback
- https://privacy.anthropic.com/en/articles/10458704-how-does-anthropic-protect-the-personal-data-of-claude-ai-users
- https://www.anthropic.com/product/enterprise
- https://docs.anthropic.com/en/docs/claude-code/data-usage

**LGPD (oficial — Planalto):**
- http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm

---

### Itens marcados "NÃO COMPROVADO — validar" (pendências antes de uso jurídico/contratual)
1. Prazos específicos de retenção do xAI Enterprise/API (Seção 3.3).
2. Valor mínimo de N (X) para o limiar anti-reidentificação do Parâmetro 4 — definir com DPO/jurídico conforme risco do dado financeiro.
3. Cabimento de legítimo interesse (art. 7º, IX) para a etapa anonimizada (Seção 7) — recomendação conservadora: ancorar em consentimento + anonimização.
4. Revalidar cada citação abrindo as URLs no navegador (fetch direto retornou 403 anti-bot em 2026-06-29; conteúdo obtido via busca indexada das páginas oficiais).
