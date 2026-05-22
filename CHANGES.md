# CHANGES — uplift session 2026-05-22

Build pass: aplica patches do quote-builder-model.patches.ts no engine,
arruma persistencia entre builder e sample, deleta colisao de presets EV,
adiciona smoke test do MCP + synthetic toggle test do engine.

## Phase A — Engine patches

| Patch | Estado antes | Acao |
|---|---|---|
| P1 — Subtotal reconciliation | ✅ ja aplicado em `proposalStateModel.ts:217` (sem marker) | Marker `// FIX(uplift):` nao foi adicionado pra nao quebrar formatacao — comportamento ja correto (subtotalFormatted = subtotal − discount, reconciliando com tax/total) |
| P2 — EV autofill | — | **SKIPPED** (autofill spec nao confiavel na pratica; operador override) |
| P3 — Stack split honra catalog.rules | ❌ hardcoded 5/6 | Aplicado em `proposalStateModel.ts` (`splitBatteryCountIntoStacks` aceita `rules`, default 5/6 mantido) + `deriveStacks(system, rules)` + caller `quoteBuilderModel.ts:670` passa `catalog?.rules` |
| P4 — sourcePayload no schema | ✅ ja aplicado em `eos-proposal.ts:316` | Drizzle schema OK |
| P5 — Render via VIEW | — | **DEFERRED** (precisa de DB up + migration aplicada; marginal pra demo) |

## Phase B — Persistence (problems 1-5 do HANDOFF)

Path escolhido: **localStorage** (option A). Gift e sandbox demo, sem auth/DB —
adequado pra provar o shape. Em prod no monorepo destino, trocar pelo tRPC ja
existente em `packages/trpc/src/routers/backoffice-proposals.ts`.

| Problema | Fix |
|---|---|
| 1 — Builder state local-only | Novo hook `apps/backoffice/src/hooks/use-draft-persistence.ts` (debounced write, cross-tab sync via storage events) |
| 2/3 — Builder ↔ Sample state share | Sample page virou shell server + `sample-client.tsx` client island lendo o mesmo `localStorage.eos-proposal-draft`. Edita em `/proposals/new` → reflete em `/proposals/sample` na hora |
| 4 — Round-trip nao testado | Coberto no synthetic toggle test (I3) — 784 assertions verdes |
| 5 — Save Draft sobrescreve proposalState | `proposalState` agora imutavel via `useState(initial)` sem setter exposto. Save so persiste draft. Reset volta pro draft inicial derivado do sample |

## Phase C — EV preset namespace collision

Deletado `packages/proposal-engine/src/evBatteryPresets.ts` (camelCase legacy,
sem importadores ativos, import path `../data/...json` quebrado). Mantido
`ev-battery-presets.ts` (kebab-case, TS limpo, exposto via barrel).

## Phase D — Synthetic toggle test

Novo: `packages/proposal-engine/scripts/synthetic-toggle-test.ts`
Comando: `bun run --cwd packages/proposal-engine test:synthetic`

Varre todo o espaco:
- **Loop A:** 10 presets × 2 V2X × 3 discount = 60 combos com defaults do preset
- **Loop B:** custom preset + variacoes de battery/controller filtradas por validade do dominio (battery ≥ controllers, battery ≤ maxPerStack × controllers)
- **Direct:** `splitBatteryCountIntoStacks` com [1,6,7,12,18] × V2X on/off

Asserts por combo:
- I0: option existe apos build
- I1 (P1): subtotal + tax = total dentro de 1 centavo
- I2 (P3): nenhum stack acima de `catalog.rules.maxModules*`
- I2b: sum de stacks = batteryModules pedido
- I3: round-trip `createBuilderDraftFromProposal(buildProposalStateFromBuilderDraft(d))` mantem campos controlados
- I4: pipeline nao lanca

**Resultado:** 784/784 PASS

## Phase E — MCP smoke test

Novo: `packages/proposal-mcp/scripts/smoke.ts`
Comando: `bun run --cwd packages/proposal-mcp smoke`

Sobe o stdio server via tsx, envia `initialize` + `tools/list`, conta tools,
mata o processo. Nao precisa de DB (tools/list e metadata pura).

**Resultado:** 15 tools registradas, todas acessiveis.

## Phase F — Asset path sanity

Verificado live via curl no `localhost:3000`:
- `/proposal-assets/covers/ev/tesla-model-cybertruck.png` → 200
- `/proposal-assets/covers/ev/ford-f150-lightning.png` → 200
- `/proposal-assets/stacks/stack-3-v2x.png` → 200

(Cybertruck PNG + asset-lookup row vieram do local Vite do Charles na sessao
anterior — sync para uplift confirmado.)

## Arquivos modificados

```
M packages/proposal-engine/package.json            (+ test:synthetic script)
M packages/proposal-engine/src/proposalStateModel.ts  (P3 split rules)
M packages/proposal-engine/src/quoteBuilderModel.ts   (P3 caller passa rules)
D packages/proposal-engine/src/evBatteryPresets.ts    (legacy, sem imports)
A packages/proposal-engine/scripts/synthetic-toggle-test.ts
M packages/proposal-mcp/package.json               (+ smoke script)
A packages/proposal-mcp/scripts/smoke.ts
M packages/database/src/data/asset-lookup.json     (Cybertruck row)
M packages/database/src/data/asset-lookup.csv      (Cybertruck row)
A apps/backoffice/public/proposal-assets/covers/ev/tesla-model-cybertruck.png
A apps/backoffice/src/hooks/use-draft-persistence.ts
M apps/backoffice/src/app/(dashboard)/proposals/new/builder.tsx
M apps/backoffice/src/app/(dashboard)/proposals/sample/page.tsx
A apps/backoffice/src/app/(dashboard)/proposals/sample/sample-client.tsx
```

## Como verificar localmente

```bash
cd eos-proposal-uplift

# 1) Engine math + round-trip (offline, rapido)
bun run --cwd packages/proposal-engine test:synthetic

# 2) MCP tools registradas (offline)
bun run --cwd packages/proposal-mcp smoke

# 3) UI live (server provavelmente ja rodando)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000
# se down: bun run dev:backoffice
```

Editar campos em http://localhost:3000/proposals/new — abrir
http://localhost:3000/proposals/sample em outra aba — confere que mostram o
mesmo state (storage event sync). Hard refresh em ambas mantem o draft.

## Para o time brasileiro

Recomendacao de aplicacao no monorepo destino, em ordem:

1. **Asset path fix** — `asset-resolver.ts:143` fallback path `proposal-assets/` deveria ser `proposals/assets/` (production 404 bug)
2. **P1 marker** — confirmar que `proposal-state-model.ts` reconcilia subtotal pos-discount; adicionar comentario `// FIX(uplift):` pra clareza no review
3. **P3 catalog rules** — port das mudancas em `splitBatteryCountIntoStacks` + caller. Atualmente destino so honra rules em `perStackModuleLimit` do quote-builder; falta no state model
4. **P4 sourcePayload** — adicionar coluna + aceitar no input do tRPC `backofficeProposals.create`
5. **P5 VIEW** — opcional, perf
6. **MCP** — so se Aurora quiser consumer out-of-process (hoje consome engine in-process)
7. **Patch 2 (EV autofill)** — pular, autofill flaky na pratica
