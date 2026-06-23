# Comandos (.claude/commands)

Os "poucos comandos" que executam as rotinas. Cada arquivo `*.md` aqui vira um comando
`/<nome>` no Claude Code. Estes são **rascunhos de especificação** — ainda não funcionais;
serão ativados nas Ondas 1–2 do roadmap (`docs/07-roadmap.md`), depois das decisões e bases.

## Comandos planejados

| Comando | Onda | Microprocessos | O que faz |
|---|---|---|---|
| `/sync-notion` | 1 | — | Sincroniza a ontologia do repo (docs/02–05) com os databases do Notion |
| `/conciliar` | 2 | FIN-TES-002, FIN-CAR-003 | Concilia extrato bancário × títulos e aponta divergências |
| `/fluxo-caixa` | 2 | FIN-TES-003/004 | Posição de caixa + projeção D+30/D+90 |
| `/faturar` | 2 | FIS-EMI-001→004 | Checklist e preparo da emissão de NF |
| `/checklist-fiscal` | 2 | FIS-OBR-001/008 | Gera o checklist de obrigações do mês |
| `/fechamento` | 4 | CTR-FEC-* | Conduz o fechamento mensal assistido |

Cada comando, quando ativado, lê: a ficha do microprocesso (Notion/repo), as bases de
conhecimento relevantes e os dados de entrada (extrato, export do ERP, planilha).
