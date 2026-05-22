# eos-proposal-uplift

> Pacote de upgrade pro slice de **Proposal Generator** do monorepo `eosloan-turborepo`.
> Cada arquivo aqui dentro espelha o caminho do seu destino no monorepo — drop-in via `cp -r`.

## Pra que serve

O Proposal Generator que ja existe no monorepo funciona, mas tem alguns buracos que afetam o dia a dia de vendas:

| Problema atual | O que este pacote traz |
|---|---|
| So 3 bundle_templates seedados (Essential/Plus/Pro). Premium, Ultimate e toda linha Commercial faltam. | 10 bundle_templates completos (5 residencial + 5 comercial) com os mesmos numeros do workbook de origem |
| Sem CHECK constraints em JSONB — `seller`, `system`, `pricing` aceitam string/null e quebram em produc&atilde;o | CHECK `jsonb_typeof = 'object'` em todas as colunas JSONB + CHECK em `currency` (regex ISO 4217) + CHECK em `status` |
| `updated_at` so atualiza se o app code lembrar (Drizzle .defaultNow()) | Trigger `set_updated_at()` server-side em todas as tabelas — bypass de app nao causa stale timestamp |
| Sem provenance — quando dado vem de n8n/Pipedrive/importer, o payload bruto se perde | Coluna `source_payload jsonb` em todas as tabelas. Debugging viavel. |
| Render model montado em JS (chamadas extras de DB + processing) | 3 VIEWS Postgres (`proposal_runtime_payload`, `asset_lookup_payload`, `ev_battery_preset_payload`) montam o payload em SQL. Fast-path opcional. |
| Sem autofill da capacidade EV — operador digita kWh manual e geralmente erra | Tabela `ev_battery_preset` com 22 EVs mapeados + helper `getConservativeEvCapacityKwh()` que aplica 80% DoD automatico |
| Tabelas de proposta no schema `public` junto com 70 outras | Tabelas movidas pra schema `eos_proposal` (mesmo padrao do `aurora` schema) — isolamento limpo |
| PDF render: print CSS incompleto, sem `@page A4`, sem Montserrat embedado | `proposal-print.css` portado 1:1 do standalone, com `@page A4 margin:0`, Montserrat via Google Fonts, page-break rules certas |
| Sem MCP server — Aurora nao consegue controlar propostas | Pacote `@repo/proposal-mcp` com 14 tools (CRUD + catalogo + EV presets + share links + render). Stdio. Aurora-callable. |

## Arquitetura do uplift

```
eos-proposal-uplift/
├── README.md             ← este arquivo
├── APPLY.md              ← passo-a-passo de como aplicar
├── MANIFEST.md           ← mapeamento arquivo->destino
├── package.json          ← workspace root (mirror eosloan)
├── turbo.json            ← tasks
├── packages/
│   ├── proposal-engine/src/
│   │   ├── ev-battery-presets.ts          ← NOVO: helper + types
│   │   ├── aurora-bridge.ts               ← NOVO: integracao com aurora-engine
│   │   ├── quote-builder-model.patches.ts ← documentacao dos patches a aplicar
│   │   └── index.ts.additions.md          ← exports a adicionar no index.ts
│   ├── proposal-mcp/                       ← NOVO PACKAGE: MCP server stdio
│   │   ├── src/index.ts
│   │   ├── src/tools/{catalog,ev-presets,proposal-crud,render,share-links}.ts
│   │   ├── src/lib/db-adapter.ts
│   │   ├── package.json
│   │   └── README.md
│   └── database/
│       ├── drizzle/0074_proposal_hardening.sql  ← migration unica
│       ├── src/
│       │   ├── schemas/eos-proposal.ts          ← NOVO: pgSchema('eos_proposal')
│       │   ├── seed-pricing-catalog.ts          ← SUBSTITUI: 10 tiers completos
│       │   ├── seed-ev-battery-presets.ts       ← NOVO
│       │   ├── seed-asset-lookup.ts             ← SUBSTITUI
│       │   └── data/
│       │       ├── pricing-catalog.json
│       │       ├── ev-battery-presets.json (+ .csv)
│       │       ├── asset-lookup.json (+ .csv)
│       │       └── proposal.sample.json
│       └── scripts/verify-proposal-contract.ts  ← NOVO: contract test
└── apps/backoffice/src/app/(dashboard)/proposals/_components/preview/
    ├── proposal-print.css            ← SUBSTITUI: portado 1:1 do standalone
    ├── proposal-document.tsx         ← SUBSTITUI
    ├── proposal-cover-page.tsx       ← SUBSTITUI
    ├── proposal-solution-page.tsx    ← SUBSTITUI
    ├── proposal-line-items-table.tsx ← SUBSTITUI
    ├── proposal-pricing-summary.tsx  ← SUBSTITUI (com fix de subtotal pos-discount)
    ├── proposal-payment-plans.tsx    ← SUBSTITUI
    ├── proposal-terms-block.tsx      ← SUBSTITUI
    └── proposal-visual-composition.tsx ← SUBSTITUI
```

## O que NAO esta no uplift

- Mudancas no `proposal-builder.tsx` (UI do operador) — mantem o que ja tem
- Mudancas em auth/permissions — CASL gating intacto
- Mudancas em `quote-builder-model.ts` direto — patches documentados em `quote-builder-model.patches.ts` pro reviewer aplicar
- Mobile app, agent, partner, web, aurora-labs — fora de escopo

## Stack

Mantido 100% no padrao eosloan:
- TypeScript estrito
- Drizzle ORM
- pgSchema('eos_proposal') (mirror de pgSchema('aurora'))
- Bun + Turborepo
- ESLint zero-warnings
- Comments em pt-BR, identifiers em EN (mesmo estilo do aurora-engine)

## Como aplicar

Ver [APPLY.md](./APPLY.md).

## Contato

Charles Atkins — `charles.atkins@eos-e.com`
Vendas, usa o gerador todo dia, conhece bem onde aperta. Disponivel pra walkthrough se precisar.
