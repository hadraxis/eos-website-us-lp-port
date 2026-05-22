# MANIFEST — mapeamento arquivo a arquivo

Cada arquivo deste pacote tem um destino direto no monorepo `eosloan-turborepo`. Caminhos espelhados — pode usar `cp -r` por subárvore.

## Banco de dados (`@repo/database`)

| Arquivo deste pacote | Destino no monorepo |
|---|---|
| `packages/database/src/schemas/eos-proposal.ts` | `packages/database/src/schemas/eos-proposal.ts` (novo) |
| `packages/database/drizzle/0074_proposal_hardening.sql` | `packages/database/drizzle/0074_proposal_hardening.sql` (nova migration) |
| `packages/database/src/seed-pricing-catalog.ts` | `packages/database/src/seed-pricing-catalog.ts` (substitui) |
| `packages/database/src/seed-ev-battery-presets.ts` | `packages/database/src/seed-ev-battery-presets.ts` (novo) |
| `packages/database/src/seed-asset-lookup.ts` | `packages/database/src/seed-asset-lookup.ts` (substitui) |
| `packages/database/src/data/ev-battery-presets.json` | `packages/database/src/data/ev-battery-presets.json` (novo) |
| `packages/database/src/data/ev-battery-presets.csv` | `packages/database/src/data/ev-battery-presets.csv` (novo, espelho editavel) |
| `packages/database/scripts/verify-proposal-contract.ts` | `packages/database/scripts/verify-proposal-contract.ts` (novo) |

Apos copiar:
1. Adicione `export * from './schemas/eos-proposal'` ao final de `packages/database/src/schema.ts`
2. Adicione scripts ao `packages/database/package.json`:
   - `"db:seed:pricing": "tsx src/seed-pricing-catalog.ts"`
   - `"db:seed:ev-presets": "tsx src/seed-ev-battery-presets.ts"`
   - `"db:seed:asset-lookup": "tsx src/seed-asset-lookup.ts"`
3. Rode `bun run db:migrate` para aplicar a migration `0074`

## Engine (`@repo/proposal-engine`)

| Arquivo deste pacote | Destino no monorepo |
|---|---|
| `packages/proposal-engine/src/ev-battery-presets.ts` | `packages/proposal-engine/src/ev-battery-presets.ts` (novo) |
| `packages/proposal-engine/src/aurora-bridge.ts` | `packages/proposal-engine/src/aurora-bridge.ts` (novo) |
| `packages/proposal-engine/src/quote-builder-model.patches.ts` | aplicar patches manualmente em `packages/proposal-engine/src/quote-builder-model.ts` (ver comentarios `// FIX(uplift):`) |

Apos copiar:
1. Adicione os novos exports ao final de `packages/proposal-engine/src/index.ts` (ver `index.ts.additions.md`)

## MCP server (`@repo/proposal-mcp` — pacote novo, opcional)

| Arquivo deste pacote | Destino no monorepo |
|---|---|
| `packages/proposal-mcp/` (pasta inteira) | `packages/proposal-mcp/` (novo workspace) |

Apos copiar:
1. Workspace ja esta declarado em `packages/*` — `bun install` na raiz pega
2. Aurora pode consumir via stdio: ver `packages/proposal-mcp/README.md`

## UI Backoffice

| Arquivo deste pacote | Destino no monorepo |
|---|---|
| `apps/backoffice/src/app/(dashboard)/proposals/_components/preview/proposal-print.css` | substitui |
| `apps/backoffice/src/app/(dashboard)/proposals/_components/preview/proposal-document.tsx` | substitui |
| `apps/backoffice/src/app/(dashboard)/proposals/_components/preview/proposal-cover-page.tsx` | substitui |
| (demais preview/*.tsx) | substitui |

Apos copiar:
1. Fonte Montserrat: usar via Google Fonts (ja incluido no print.css com `@import`)
2. Sem mudancas no `proposal-builder.tsx` operador — so na arvore de preview

## Docs

| Arquivo | Proposito |
|---|---|
| `README.md` | Pitch + escopo do uplift |
| `APPLY.md` | Comandos passo a passo |
| `MANIFEST.md` | Este arquivo |
