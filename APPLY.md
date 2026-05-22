# APPLY.md — como aplicar o uplift

Pre-requisitos:
- Repo `eosloan-turborepo` clonado e funcionando (`bun install` ja rodou pelo menos uma vez)
- Postgres + Redis up (`bun run docker:up`)
- Backup do DB recomendado: `pg_dump eosloan > backup-pre-uplift.sql`

## Opcao A — drop-in completo (4 etapas)

### 1. Copiar arquivos

A partir da raiz do `eos-proposal-uplift/`:

```bash
# Schema, migration, seeds, scripts
cp packages/database/src/schemas/eos-proposal.ts \
   ../eosloan-turborepo/packages/database/src/schemas/eos-proposal.ts
cp packages/database/drizzle/0074_proposal_hardening.sql \
   ../eosloan-turborepo/packages/database/drizzle/0074_proposal_hardening.sql
cp packages/database/src/seed-pricing-catalog.ts \
   ../eosloan-turborepo/packages/database/src/seed-pricing-catalog.ts
cp packages/database/src/seed-ev-battery-presets.ts \
   ../eosloan-turborepo/packages/database/src/seed-ev-battery-presets.ts
cp packages/database/src/seed-asset-lookup.ts \
   ../eosloan-turborepo/packages/database/src/seed-asset-lookup.ts
cp -r packages/database/src/data \
   ../eosloan-turborepo/packages/database/src/
cp packages/database/scripts/verify-proposal-contract.ts \
   ../eosloan-turborepo/packages/database/scripts/verify-proposal-contract.ts

# Engine
cp packages/proposal-engine/src/ev-battery-presets.ts \
   ../eosloan-turborepo/packages/proposal-engine/src/ev-battery-presets.ts
cp packages/proposal-engine/src/aurora-bridge.ts \
   ../eosloan-turborepo/packages/proposal-engine/src/aurora-bridge.ts

# MCP server (pacote novo)
cp -r packages/proposal-mcp \
   ../eosloan-turborepo/packages/proposal-mcp

# UI Backoffice
cp -r 'apps/backoffice/src/app/(dashboard)/proposals/_components/preview' \
   '../eosloan-turborepo/apps/backoffice/src/app/(dashboard)/proposals/_components/preview'
```

### 2. Editar arquivos existentes (5 mudancas pequenas)

**a.** `packages/database/src/schema.ts` — adicionar export no final:
```ts
export * from './schemas/eos-proposal'
```

**b.** `packages/database/package.json` — adicionar scripts:
```json
"db:seed:pricing": "tsx src/seed-pricing-catalog.ts",
"db:seed:ev-presets": "tsx src/seed-ev-battery-presets.ts",
"db:seed:asset-lookup": "tsx src/seed-asset-lookup.ts",
"verify:proposal-contract": "tsx scripts/verify-proposal-contract.ts"
```

**c.** Raiz `package.json` — adicionar:
```json
"db:seed:pricing": "dotenv -- turbo run db:seed:pricing --filter=@repo/database",
"db:seed:ev-presets": "dotenv -- turbo run db:seed:ev-presets --filter=@repo/database",
"db:seed:asset-lookup": "dotenv -- turbo run db:seed:asset-lookup --filter=@repo/database",
"verify:proposal-contract": "dotenv -- turbo run verify:proposal-contract --filter=@repo/database"
```

**d.** `packages/proposal-engine/src/index.ts` — adicionar exports do `index.ts.additions.md`

**e.** Rota host da preview no backoffice — importar o CSS uma vez:
```ts
import './_components/preview/proposal-print.css'
```

### 3. Rodar migration + seeds

```bash
cd ../eosloan-turborepo

# Instala (pra puxar deps do novo packages/proposal-mcp)
bun install

# Aplica a migration 0074
bun run db:migrate

# Seeds
bun run db:seed:pricing
bun run db:seed:ev-presets
bun run db:seed:asset-lookup

# Valida tudo
bun run verify:proposal-contract
```

Expected output:
```
=== verify-proposal-contract ===
✓ pricing_catalog ativo existe
✓ pricing_catalog tem 6 catalog_items
✓ pricing_catalog tem 10 bundle_templates
✓ ev_battery_preset tem >= 20 presets ativos
✓ EV preset autofill: ford-f150-lightning -> 78 kWh conservador
✓ asset_lookup_row tem >= 4 layoutRecipes
✓ asset image refs sao portateis (sem path absoluto)
✓ asset-lookup.csv e .json alinhados
✓ ev-battery-presets.csv e .json alinhados
✓ normalizePresetId('home-reserve') === 'pro'
✓ normalizeEvId(null, 'f150') === 'ford-f150-lightning'
✓ VIEW proposal_runtime_payload acessivel
✓ VIEW asset_lookup_payload acessivel
✓ VIEW ev_battery_preset_payload acessivel

14 passou, 0 falhou
```

### 4. (Opcional) Testar MCP server

```bash
bun run --cwd packages/proposal-mcp start
# Em outro terminal, conectar com qualquer cliente MCP (Claude Desktop, Cursor, etc)
# Tools disponiveis: health, list_plans, get_catalog, list_ev_presets, get_ev_capacity,
#                   list_proposals, get_proposal, create_proposal, patch_proposal,
#                   delete_proposal, render_model, render_asset_lookup,
#                   create_share_link, list_share_events
```

Pra wire no Aurora, ver `packages/proposal-mcp/README.md`.

## Opcao B — em PRs separados

Se preferir merge incremental, divida em 4 PRs:

| PR | Arquivos | Risco | Reviewer foca em |
|---|---|---|---|
| **#1 DB hardening** | `0074_proposal_hardening.sql`, `schemas/eos-proposal.ts`, schema.ts export | Medio (mexe em schema namespace) | Migration reversibility, FK preservation |
| **#2 Seeds + verify** | seed-* files, scripts/verify-*, src/data/ | Baixo | Numeros do catalogo, count assertions |
| **#3 Engine + UI** | ev-battery-presets.ts, aurora-bridge.ts, components preview/* | Baixo | TSX types, print CSS rules |
| **#4 MCP** | packages/proposal-mcp/ inteiro | Baixo (pacote novo, nao afeta nada) | Aurora integration patterns |

## Rollback

Cada etapa eh reversivel:

```bash
# Reverter migration 0074
psql $DATABASE_URL -c "
  BEGIN;
  ALTER TABLE eos_proposal.proposal SET SCHEMA public;
  ALTER TABLE eos_proposal.pricing_catalog SET SCHEMA public;
  -- (idem para as outras tabelas)
  DROP SCHEMA eos_proposal CASCADE;
  COMMIT;
"
git revert <commit do uplift>
```

## Smoke test pos-deploy

1. Abrir `/dashboard/proposals/new` no backoffice
2. Escolher um bundle template (deve mostrar 10 opcoes)
3. Trocar o cover EV pra Ford F-150 Lightning — campo "EV battery capacity" deve autofill 78 kWh
4. Abrir preview — print to PDF (Ctrl+P) — pdf deve render A4, 2+ paginas, fontes Montserrat
5. Conectar Aurora ao MCP, chamar `list_plans` — deve retornar 10 plans

## Duvidas

Charles Atkins / Eos-e — `charles.atkins@eos-e.com`
Posso fazer walkthrough remoto, pair na aplicacao, ou ficar disponivel pra debug. Sem stress.
