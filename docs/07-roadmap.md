# 07 — Roadmap (em ondas)

Princípio: **valor cedo, infra sob demanda.** Não construímos tudo de uma vez; cada onda
entrega algo usável e só adiciona técnica quando uma rotina vira gargalo.

## Onda 0 — Fundação (em andamento)
- [x] Estrutura do repositório e ontologia (`docs/00`–`01`).
- [x] Mapa de Pilares/Processos/Microprocessos — Financeiro e Fiscal detalhados.
- [x] Esboço de Controladoria e RH.
- [x] Estrutura do Notion definida (`docs/06`).
- [ ] **Você:** revisar e confirmar decisões D1–D7.
- [ ] **Você:** colar as bases de conhecimento em `bases-de-conhecimento/`.

## Onda 1 — Documentação viva no Notion
- [ ] Criar a integração do Notion (token + databases de `docs/06`).
- [ ] Comando `/sync-notion`: popular Notion com a ontologia do repo.
- [ ] Escrever os POPs dos 5–8 microprocessos mais críticos (a partir das suas bases).
- **Resultado:** operação inteira navegável e padronizada no Notion.

## Onda 2 — Primeiros comandos (maior dor: conciliação e emissão)
Candidatos a primeiro comando, por ROI:
1. **`/conciliar`** — concilia extrato bancário × títulos (FIN-TES-002, FIN-CAR-003).
2. **`/fluxo-caixa`** — posição de caixa + projeção D+30/D+90 (FIN-TES-003/004).
3. **`/faturar`** — checklist + preparo de emissão de NF (FIS-EMI-001→004).
4. **`/checklist-fiscal`** — obrigações do mês a partir do calendário (FIS-OBR-001/008).
- Começam como **Assistido** (Claude prepara, você confere) e sobem para Automatizado.
- **Resultado:** as duas maiores dores de tempo (financeiro + emissão) encurtadas.

## Onda 3 — Integrações de dados
- [ ] Conector de extratos bancários (OFX/API/Open Finance — depende de D5).
- [ ] Conector do ERP (export/API — depende de D2).
- [ ] Scripts Python utilitários chamados pelos comandos.
- **Resultado:** comandos deixam de depender de cópia manual de dados.

## Onda 4 — Controladoria e fechamento
- [ ] `/fechamento` — checklist + conciliações + DRE gerencial assistida.
- [ ] Painel de KPIs no Notion alimentado pelas rotinas.

## Onda 5 — RH e consolidação
- [ ] Definir fronteira interno × terceirizado (D6) e automatizar o que ficar interno.
- [ ] Rotinas agendadas e monitor de pendências consolidado.

## Sequência sugerida de execução imediata
1. Você confirma D1 (abordagem) e me passa D2–D5 (ERP, regime, tipo de NF, banco).
2. Você cola 2–3 bases de conhecimento mais importantes.
3. Eu monto a integração do Notion + `/sync-notion` (Onda 1).
4. Escolhemos **um** comando da Onda 2 para ser o primeiro piloto end-to-end.
