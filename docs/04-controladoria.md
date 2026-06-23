# 04 — Controladoria (esboço)

Departamento `CTR`. Esboço para validação. Detalharemos após Financeiro e Fiscal.
A Controladoria **consome** os dados gerados por Financeiro e Fiscal — por isso vem depois.

## Pilar CTR-FEC — Fechamento Mensal
- CTR-FEC-001 — Checklist de fechamento (cut-off de receitas/despesas)
- CTR-FEC-002 — Conciliação de contas patrimoniais
- CTR-FEC-003 — Lançamentos de ajuste (provisões, competência, depreciação)
- CTR-FEC-004 — Validação do balancete
- CTR-FEC-005 — Trava do período + arquivo do fechamento

## Pilar CTR-DRE — DRE Gerencial & Orçamento
- CTR-DRE-001 — DRE gerencial mensal (por centro de custo / unidade)
- CTR-DRE-002 — Orçamento anual e revisões
- CTR-DRE-003 — Análise orçado × realizado (variações)
- CTR-DRE-004 — Margem de contribuição e ponto de equilíbrio

## Pilar CTR-KPI — KPIs & Relatórios
- CTR-KPI-001 — Painel de indicadores (caixa, margem, inadimplência, carga tributária)
- CTR-KPI-002 — Relatório mensal para sócios/gestão
- CTR-KPI-003 — Alertas de desvio (gatilhos automáticos)

## Pilar CTR-CUS — Custos & Precificação
- CTR-CUS-001 — Estrutura de custos (fixos/variáveis, diretos/indiretos)
- CTR-CUS-002 — Formação de preço / markup mínimo
- CTR-CUS-003 — Análise de rentabilidade por produto/cliente/contrato

## KPIs
- Tempo de fechamento (dias úteis); margem líquida; EBITDA; orçado × realizado;
  rentabilidade por cliente.

> Forte candidato a automação assistida: **DRE gerencial mensal** a partir do balancete
> + classificação por centro de custo já feita no Financeiro.
