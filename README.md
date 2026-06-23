# Claude Financeiro — Sistema de Operação do Departamento Financeiro

Motor de automação e documentação para operar **Financeiro, Controladoria, Fiscal e RH**
de uma empresa de ~R$ 10M/ano de faturamento com **uma única pessoa**, eliminando trabalho
manual e tarefas repetitivas.

> Estado atual: **fundação** (terra arrasada → estrutura). Nada de produção ainda.

## A ideia em uma frase

Documentar a operação como **Pilares → Processos → Microprocessos** (no Notion, espelhado
neste repositório) e transformar as rotinas repetitivas em **poucos comandos** executados
pelo Claude Code, integrados ao Notion, ao ERP, às planilhas e ao banco.

## Como está organizado

```
Claude_Financeiro/
├── README.md                       ← você está aqui
├── docs/
│   ├── 00-visao-e-arquitetura.md   ← o que é o "sistema" e por quê
│   ├── 01-modelo-pilares-processos.md ← a ontologia (taxonomia + ficha-padrão)
│   ├── 02-financeiro.md            ← pilares/processos/microprocessos (prioridade)
│   ├── 03-fiscal.md                ← pilares/processos/microprocessos (prioridade)
│   ├── 04-controladoria.md         ← esboço
│   ├── 05-rh.md                    ← esboço
│   ├── 06-notion-estrutura.md      ← bancos de dados do Notion + integração
│   └── 07-roadmap.md               ← por onde começar, em ondas
├── bases-de-conhecimento/          ← onde você cola/exporta o conteúdo dos chats
│   ├── README.md
│   └── _template-base.md
└── .claude/
    └── commands/                   ← os "poucos comandos" (specs iniciais)
```

## Próximos passos

1. Revisar `docs/00-visao-e-arquitetura.md` e confirmar a abordagem.
2. Validar/ajustar a modelagem em `docs/01` a `docs/05`.
3. Colar as bases de conhecimento em `bases-de-conhecimento/` (ver instruções lá).
4. Criar a integração com o Notion (token + estrutura de `docs/06`).
5. Ativar os primeiros comandos (ver `docs/07-roadmap.md`).
