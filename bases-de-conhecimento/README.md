# Bases de Conhecimento

Aqui ficam as bases que hoje estão nos seus chats do Claude — versionadas, pesquisáveis
e usadas pelos comandos como contexto. **Você cola/exporta o conteúdo aqui.**

## Como contribuir uma base

1. Copie um arquivo de `_template-base.md`.
2. Renomeie com um nome claro e prefixo de área, ex.:
   - `fin-politica-pagamentos.md`
   - `fis-matriz-tributacao.md`
   - `empresa-contexto-geral.md`
   - `ctr-plano-de-contas.md`
3. Cole o conteúdo do chat correspondente.
4. Preencha o cabeçalho (área, origem, data, sensibilidade).

## O que priorizar (alinhado às dores: Financeiro + Fiscal)

| Prioridade | Base | Por quê |
|---|---|---|
| 🔴 Alta | Contexto geral da empresa (atividade, regime, porte) | Calibra tudo |
| 🔴 Alta | Matriz/regras de tributação e emissão de NF | Habilita FIS-EMI/APU |
| 🔴 Alta | Política de pagamentos e recebimentos | Habilita FIN-CAP/CAR |
| 🟡 Média | Plano de contas e centros de custo | Habilita classificação e DRE |
| 🟡 Média | Lista de bancos/contas e fornecedores recorrentes | Habilita tesouraria |
| 🟢 Baixa | RH: estrutura de pessoal, benefícios | Onda posterior |

## ⚠️ Dados sensíveis

- **Não cole** senhas, tokens, certificados digitais ou chaves de API aqui.
- Dados pessoais (CPF, salários) e bancários: marque `sensibilidade: alta` no cabeçalho
  e considere anonimizar nos exemplos. Avaliaremos juntos se este repo é o lugar certo
  ou se ficam fora do versionamento.
