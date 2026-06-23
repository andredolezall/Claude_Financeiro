# Comandos (.claude/commands)

Os "poucos comandos" que executam as rotinas. Cada arquivo `*.md` aqui vira um comando
`/<nome>` no Claude Code.

## Comandos

| Comando | Status | Microprocessos | O que faz |
|---|---|---|---|
| `/fluxo-caixa` | ✅ ativo | FIN-TES-002/003 | Posição de caixa + resumo categorizado a partir de OFX |
| `/conciliar` | ✅ ativo | FIN-TES-002, FIN-CAR-003 | Concilia extrato OFX × títulos (CSV MaxiProd) e aponta divergências |
| `/sync-notion` | ⏳ próximo | — | Sincroniza a ontologia do repo (docs/02–05) com os databases do Notion |
| `/faturar` | 🗒️ planejado | FIS-EMI-001→004 | Checklist e preparo da emissão de NF-e |
| `/checklist-fiscal` | 🗒️ planejado | FIS-OBR-001/008 | Gera o checklist de obrigações do mês |
| `/fechamento` | 🗒️ planejado | CTR-FEC-* | Conduz o fechamento mensal assistido |

Cada comando, quando ativado, lê: a ficha do microprocesso (Notion/repo), as bases de
conhecimento relevantes e os dados de entrada (extrato, export do ERP, planilha).
