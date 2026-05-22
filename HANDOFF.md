# HANDOFF — next session pickup

> Read this first. Self-contained brief for a fresh Claude session to review code + logic without prior context.

---

## What this is

`eos-proposal-uplift` — drop-in monorepo upgrade for the **Proposal Generator** slice of `eosloan-turborepo` (Brazilian team's lending platform). Lives at `E:\GPT4all\workspace-hub\eos-proposal-uplift\`. Remote: https://github.com/hadraxis/eos-website-us-lp-port/tree/eos-proposal.

The user is **Charles (sales)**. He uses the proposal generator daily on live calls. He built a standalone Vite/React version at `E:\AI\workspaces\web\proposal-generator\` that works well. The Brazilian dev team forked his engine into their monorepo but botched the integration (only 3 of 10 bundle templates seeded, PDF render broken, missing EV autofill, no SQL constraints). This uplift is his unsolicited fix-pack.

## Current state — what runs

```bash
cd E:/GPT4all/workspace-hub/eos-proposal-uplift
# server is likely already running. Check first:
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000

# if down:
export PATH="$PATH:$(npm prefix -g)"
bun run dev:backoffice
```

Three live routes:
| URL | What it does |
|---|---|
| `/` | Landing page, links to builder + sample |
| `/proposals/new` | **Quote Builder** — operator form + live preview pane |
| `/proposals/sample` | Read-only ProposalDocument render from `proposal.sample.json` |

## Stack

- Bun 1.3.14 + Turborepo
- Next.js 16.2.6 (Turbopack) + React 19.2.3
- Drizzle ORM + Postgres 16 (Docker — `docker-compose up` to spin up)
- `@repo/proposal-engine` = ported `.ts` files from Charles's standalone (`@ts-nocheck` header, loose JS-style TS)
- `@repo/proposal-mcp` = stdio MCP server for Aurora (the team's AI tool) to consume
- `pgSchema('eos_proposal')` namespace pattern mirroring their `pgSchema('aurora')`
- Comments + docs in pt-BR (mirrors Aurora team's style), identifiers in EN

## Critical files map

```
packages/proposal-engine/src/
  index.ts                       — barrel
  types.ts                       — TS types for ProposalState etc
  quoteBuilderModel.ts           — pricing math, builder draft logic (763 LOC, @ts-nocheck port)
  proposalStateModel.ts          — normalization, splitBatteryCountIntoStacks
  proposalShareLinks.ts          — tracked link logic
  proposalVisibility.ts          — line-item show/hide conditions
  assetResolver*.ts              — cover + stack visual resolution
  ev-battery-presets.ts          — NEW TS helper (80% DoD autofill)
  aurora-bridge.ts               — NEW: integration helpers (runIdeation, searchLibrary)
  quote-builder-model.patches.ts — DOCS-ONLY: 5 documented patches for reviewer

packages/database/
  drizzle/0074_proposal_hardening.sql  — CHECK constraints + GIN + triggers + VIEWs + namespace move
  src/schemas/eos-proposal.ts          — Drizzle TS schema (pgSchema('eos_proposal'))
  src/schema.ts                        — barrel + user/customer/plan stubs
  src/seed-pricing-catalog.ts          — 10 bundle templates
  src/seed-ev-battery-presets.ts       — 22 EVs
  src/seed-asset-lookup.ts             — covers/stacks/layouts
  src/data/*.json + .csv               — canonical seed data
  scripts/verify-proposal-contract.ts  — 14 assertions, CI gate
  scripts/migrate.ts                   — raw SQL migration runner

packages/proposal-mcp/src/
  index.ts                       — McpServer stdio entry, 14 tools
  tools/{catalog,ev-presets,proposal-crud,render,share-links}.ts
  lib/db-adapter.ts              — Drizzle re-exports

apps/backoffice/src/app/
  page.tsx                                                — landing (Server Component)
  (dashboard)/proposals/sample/page.tsx                   — read-only preview (Server Component)
  (dashboard)/proposals/new/page.tsx                      — builder page (Server Component, reads JSON from FS)
  (dashboard)/proposals/new/builder.tsx                   — Quote Builder client component, 'use client' (520 LOC)
  (dashboard)/proposals/new/builder.css                   — builder shell styles
  (dashboard)/proposals/_components/preview/proposal-print.css   — A4 print rules, Montserrat via Google Fonts
  (dashboard)/proposals/_components/preview/proposal-document.tsx — render root
  (dashboard)/proposals/_components/preview/proposal-cover-page.tsx
  (dashboard)/proposals/_components/preview/proposal-solution-page.tsx
  (dashboard)/proposals/_components/preview/proposal-{line-items-table,pricing-summary,payment-plans,terms-block,visual-composition}.tsx
```

---

## ⚠️ PRIMARY REVIEW TARGET — state persistence gaps

**The user explicitly flagged state persistence between screens as the area to review.** Current state is broken/missing in multiple places.

### Problem 1 — Builder state is local-only

`builder.tsx` uses `useState` for `proposalState` and `draft`. Save Draft just calls `setProposalState(next)` + `console.log`. **Nothing persists**. Navigate away → state gone. Hard refresh → state gone.

Options to fix (pick one + propose to user before implementing):
- **Option A (low effort):** `localStorage` — persist `draft` to `localStorage.eos-proposal-draft` on every change. On mount, hydrate from there. Works offline, no backend.
- **Option B (medium):** URL search params — encode draft delta in `?draft=<base64>`. Shareable, no state leak between users. Works for small drafts only (URL length).
- **Option C (correct):** tRPC + Drizzle — `proposal.create` on Save Draft, `proposal.byId` to load. Real persistence. Needs DB up + migrations applied (`bun run docker:up && bun run db:migrate && bun run db:seed:pricing`). The schema + seeds already exist (`packages/database/src/schemas/eos-proposal.ts`), but **there's no tRPC layer in this gift** — yours has Drizzle calls in `seed-*.ts` but no `@repo/trpc` package. Either add one or stub a route handler at `app/api/proposals/[id]/route.ts`.

### Problem 2 — Builder and Sample preview don't share state

User flow assumption: edit in builder → see in sample preview. **Today it doesn't work that way.**

- `/proposals/new` (builder) reads `proposal.sample.json` server-side, passes to client component, builder mutates local copy
- `/proposals/sample` reads `proposal.sample.json` server-side independently, renders read-only

Click between them = two different state trees. The builder's "Sample Preview" button (`<a href="/proposals/sample">`) navigates to a stale read-only view.

Fix path tied to Problem 1's pick:
- If localStorage → `/proposals/sample` must also read from localStorage on mount (client component) or accept a query param
- If URL params → encode draft in builder's link to sample
- If tRPC → `sample` route becomes `/proposals/[id]` reading from DB

### Problem 3 — Sample preview is server component, can't hydrate from client state

`apps/backoffice/src/app/(dashboard)/proposals/sample/page.tsx` is `async` server component. It reads JSON from `process.cwd()/../../packages/database/src/data/`. No way to inject the builder's draft. Refactor to client component OR split: server component fetches initial, client island reads localStorage/query param and overrides.

### Problem 4 — Engine state model has `createBuilderDraftFromProposal` round-trip but no test

`createBuilderDraftFromProposal(proposalState) → BuilderDraft` and `buildProposalStateFromBuilderDraft(initialState, draft, catalog) → ProposalState` form a round-trip. Verify it actually round-trips: `createBuilderDraftFromProposal(buildProposalStateFromBuilderDraft(s, d, c))` should equal `d` modulo computed fields. **There's no test for this.** Add one to `scripts/verify-proposal-contract.ts`.

### Problem 5 — "Save Draft" semantically broken

Currently `Save Draft` = `setProposalState(buildProposalStateFromBuilderDraft(...))`. This OVERWRITES `proposalState` with the applied state. After Save, `createBuilderDraftFromProposal(proposalState)` (effectively what Reset would do) returns the saved state, not the original sample. So Reset is wrong after Save.

Probably want: keep `proposalState` immutable (initial sample), only mutate `draft`. Save = persist draft (to localStorage/DB/etc), don't change `proposalState`.

---

## Secondary review targets — logic correctness

### Engine drift between yours' .js and ours' .ts (@ts-nocheck)

Engine files in `packages/proposal-engine/src/*.ts` are verbatim ports of yours' `.js` with header `// @ts-nocheck` + `from './foo'` (extension stripped from `./foo.js`). **No type safety on engine internals.** Type annotations live only in `types.ts` (re-exported via `index.ts`). Worth converting one file at a time to real strict TS — start with `proposalStateModel.ts` (smallest at ~250 LOC, most central).

### Documented patches not applied to live engine

`packages/proposal-engine/src/quote-builder-model.patches.ts` documents 5 patches that should land in `quoteBuilderModel.ts`:

1. **Subtotal display reconciliation** (Charles's 2026-05-05 fix — Subtotal pre-discount but Tax/Total post-discount didn't reconcile)
2. **EV capacity autofill flag** (`evCapacityManualOverride` boolean to prevent overwriting user input)
3. **`splitBatteryCountIntoStacks` read maxModulesWithV2x from catalog.rules** (currently hardcoded `includesV2x ? 5 : 6`)
4. **Source payload preservation on create**
5. **Render model via VIEW** (use `eos_proposal.proposal_runtime_payload` SQL view)

Check each — are they live in the ported `quoteBuilderModel.ts`? If yes, delete patches file. If no, apply them.

### Asset path mismatch — engine references `proposal-assets/` but app serves at root

`proposalStateModel.ts` and `assetResolver.ts` reference image paths like `proposal-assets/stacks/stack-1-no-v2x.png`. Next.js serves from `apps/backoffice/public/` so the URL becomes `/proposal-assets/stacks/stack-1-no-v2x.png`. Check actual `imageSrc` values in rendered preview — if 404s on images, asset path resolution is wrong.

### EV preset autofill — engine uses module scope vs DB

`packages/proposal-engine/src/evBatteryPresets.ts` (camelCase, legacy port) reads from `data/ev-battery-presets.json` at import time. `packages/proposal-engine/src/ev-battery-presets.ts` (kebab-case, new TS helper) takes a set object as parameter. **Builder calls the legacy one (`getConservativeEvCapacityKwh(evId)` no set arg).** Both export same function name. Verify which one Next is actually resolving — there's a collision risk via `index.ts` re-exports.

### MCP server has no end-to-end test

`packages/proposal-mcp/` registers 14 tools but there's no script to spawn the server and call them. Add a smoke test (`bun run --cwd packages/proposal-mcp dev` then send a `tools/list` JSON-RPC over stdin, assert 14 tools returned).

---

## How to start work

1. Verify server up: `curl http://localhost:3000` → expect 200
2. If down: `cd E:/GPT4all/workspace-hub/eos-proposal-uplift && export PATH="$PATH:$(npm prefix -g)" && bun run dev:backoffice`
3. Read this file. Read [README.md](./README.md) + [APPLY.md](./APPLY.md) for the broader strategy.
4. Pick a review target from above. Confirm scope with Charles before changing code.
5. Charles is sales, vibe-codes, no traditional dev background — explain tradeoffs in plain terms, recommend one path before asking him to pick.

## Constraints from Charles (the user)

- **Stay in pt-BR for code comments and docs** (mirror Aurora team)
- **Don't touch their auth/permissions** (CASL + Better Auth in destination monorepo)
- **MCP server stays** — Aurora (their Gemini-based AI tool) consumes it
- **Engine is framework-agnostic** — no React imports in `packages/proposal-engine/`
- **Code style matches eosloan-turborepo** — kebab-case files, ESM, Drizzle, Bun
- **Branch on remote = `eos-proposal`** — push there. Force-push only with explicit OK (yesterday's session pushed LP code there by mistake; current commit overwrote it).

## Git state

```bash
cd E:/GPT4all/workspace-hub/eos-proposal-uplift
git log --oneline  # should show 3 commits, last = e857ce0 (builder added)
git remote -v       # origin = https://github.com/hadraxis/eos-website-us-lp-port.git
```

Branch `eos-proposal` at `e857ce0`. Lightning LP backup safe at `feat/lp-lightning-generator-routes`.

## Engram references

- `project_eos_proposal_simulator.md` — workbook (2) pricing canonical
- `project_eos_repo_topology.md` — multi-tree topology warning
- `feedback_homepage_patterns.md` — no em dashes, no internal copy in customer-facing strings
- `feedback_design_preferences.md` — no SaaS look, desktop-first
