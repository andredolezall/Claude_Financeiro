# 03 — Fiscal (prioridade)

Departamento `FIS`. Foco imediato: **emissão de notas** (peso igual ao Financeiro).

**Contexto travado (D2–D4):** indústria, ERP **MaxiProd**, **Lucro Presumido**,
emissão de **NF-e (produto)**. Logo o eixo fiscal é: ICMS (apuração própria),
PIS/COFINS cumulativo, IRPJ/CSLL trimestral por presunção, SPED Fiscal e
EFD-Contribuições. (IPI só se a empresa for industrial equiparada/contribuinte de IPI —
**a confirmar** conforme o NCM dos produtos.)

---

## Pilar FIS-EMI — Emissão de Documentos Fiscais

**Objetivo:** emitir a nota certa, com tributação correta, no prazo, sem retrabalho.

### Processo: Emissão de NF (produto NF-e e/ou serviço NFS-e)
| ID | Microprocesso | Freq. | Estágio | Auto |
|----|---------------|-------|---------|------|
| FIS-EMI-001 | Coleta do pedido/contrato a faturar | sob demanda | Documentado | 🤖 |
| FIS-EMI-002 | Validação de cadastro do tomador/destinatário | sob demanda | Documentado | 🤖 |
| FIS-EMI-003 | Determinação de tributação (CFOP/CST/CNAE/ISS, alíquotas) | sob demanda | Documentado | Assistido |
| FIS-EMI-004 | Emissão da NF no emissor/ERP | sob demanda | Documentado | 🤖 |
| FIS-EMI-005 | Validação de retorno (autorização/rejeição SEFAZ/Prefeitura) | sob demanda | Documentado | 🤖 |
| FIS-EMI-006 | Envio da NF ao cliente | sob demanda | Documentado | 🤖 |
| FIS-EMI-007 | Registro do título a receber (handoff p/ FIN-CAR-001) | sob demanda | Documentado | 🤖 |
| FIS-EMI-008 | Cancelamento/carta de correção (quando necessário) | sob demanda | Documentado | Assistido |
| FIS-EMI-009 | Guarda do XML/DANFE/RPS (5 anos) | sob demanda | Documentado | 🤖 |

**Regras críticas a explicitar** (pré-requisito para automatizar EMI-003):
- Matriz de tributação por produto/serviço × UF/município × tipo de cliente.
- Tabela de CFOP/CST (produto) ou código de serviço + ISS (serviço).
- Retenções aplicáveis (ISS, IRRF, PIS/COFINS/CSLL — quando tomador retém).

**Rotinas:** "Faturamento do dia" · "Monitor de rejeições SEFAZ".

---

## Pilar FIS-APU — Apuração de Tributos

**Objetivo:** apurar e recolher o valor correto, no prazo, com memória de cálculo.

| ID | Microprocesso | Freq. | Estágio | Auto |
|----|---------------|-------|---------|------|
| FIS-APU-001 | Consolidação das notas emitidas/recebidas do período | mensal | Documentado | 🤖 |
| FIS-APU-002 | Apuração PIS/COFINS | mensal | Documentado | Assistido |
| FIS-APU-003 | Apuração ICMS (se produto) ou ISS (se serviço) | mensal | Documentado | Assistido |
| FIS-APU-004 | Apuração IRPJ/CSLL (presumido: trimestral) | mensal/trim. | Documentado | Assistido |
| FIS-APU-005 | Geração de guias (DARF/GARE/DAM) | mensal | Documentado | 🤖 |
| FIS-APU-006 | Conferência tributo apurado × contabilizado | mensal | Documentado | 🤖 |
| FIS-APU-007 | Agendamento de pagamento das guias (handoff p/ FIN-CAP) | mensal | Documentado | 🤖 |

> Para **Lucro Presumido** (provável em ~10M de serviço): IRPJ/CSLL trimestral por
> presunção; PIS/COFINS cumulativo. Para **Lucro Real**: PIS/COFINS não-cumulativo,
> mais complexidade. **Confirmar D3.**

---

## Pilar FIS-OBR — Obrigações Acessórias

**Objetivo:** entregar todas as declarações no prazo, sem multa.

| ID | Microprocesso | Freq. | Estágio | Auto |
|----|---------------|-------|---------|------|
| FIS-OBR-001 | Calendário fiscal anual (todas as obrigações + prazos) | anual | Documentado | 🤖 |
| FIS-OBR-002 | EFD-Contribuições | mensal | Documentado | Assistido |
| FIS-OBR-003 | SPED Fiscal (ICMS/IPI, se produto) | mensal | Documentado | Assistido |
| FIS-OBR-004 | DCTFWeb | mensal | Documentado | Assistido |
| FIS-OBR-005 | EFD-Reinf | mensal | Documentado | Assistido |
| FIS-OBR-006 | Declaração municipal de serviços (se NFS-e) | mensal | Documentado | Assistido |
| FIS-OBR-007 | ECD/ECF | anual | Documentado | manual |
| FIS-OBR-008 | Checklist de entrega + protocolo arquivado | mensal | Documentado | 🤖 |

**Rotina:** "Checklist fiscal do mês" (gerado a partir do calendário FIS-OBR-001).

---

## Pilar FIS-CER — Certidões & Compliance

**Objetivo:** manter a empresa regular (certidões válidas) e antecipar pendências.

| ID | Microprocesso | Freq. | Estágio | Auto |
|----|---------------|-------|---------|------|
| FIS-CER-001 | Monitor de certidões (CND federal, estadual, municipal, FGTS, trabalhista) | mensal | Documentado | 🤖 |
| FIS-CER-002 | Renovação/regularização de certidão | sob demanda | Documentado | Assistido |
| FIS-CER-003 | Acompanhamento de malha/intimações | sob demanda | Documentado | Assistido |

---

## KPIs do departamento Fiscal

- **Emissão:** % notas emitidas sem rejeição; tempo médio de emissão; nº de cancelamentos.
- **Apuração:** carga tributária efetiva (% sobre faturamento); guias pagas no prazo.
- **Obrigações:** % obrigações entregues no prazo; multas evitadas/incorridas.
- **Compliance:** % certidões válidas; pendências em aberto.

## Dependências externas (a confirmar com você)

- **D3 — Regime tributário:** muda apuração e obrigações inteiras.
- **D4 — Tipo de NF:** NF-e (produto) → ICMS/SPED Fiscal; NFS-e (serviço) → ISS/declaração municipal.
- Emissor de NF / módulo fiscal do ERP (D2).
- Acesso aos portais (e-CAC, SEFAZ, Prefeitura) e ao certificado digital A1/A3.
