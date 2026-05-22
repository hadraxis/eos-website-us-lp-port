/**
 * PATCHES manuais pro quote-builder-model.ts existente.
 *
 * Este arquivo NAO substitui o quote-builder-model.ts atual (1063 linhas).
 * Ele documenta os patches que devem ser aplicados manualmente, com
 * marcadores `// FIX(uplift):` pro reviewer encontrar.
 *
 * Por que patches em vez de substituir?
 *   - quote-builder-model.ts atual ja tem helpers uteis (createBuilderDraftFromProposal etc)
 *   - PR menor = mais facil de revisar
 *   - Cada patch tem reason + before/after + impact
 *
 * Como aplicar:
 *   1. Abra packages/proposal-engine/src/quote-builder-model.ts
 *   2. Procure as funcoes mencionadas
 *   3. Aplique cada patch (busca por `// FIX(uplift):` neste arquivo)
 *   4. Rode `bun run check-types` e `bun run lint`
 */

// =====================================================================
// PATCH 1 — Subtotal display reconciliation
// =====================================================================
// CONTEXTO: O Pricing Summary mostrava Subtotal pre-discount, mas Tax e
// Total pos-discount. As tres linhas nao reconciliavam — o cliente via
// "Subtotal $X, Tax $Y, Total $Z" onde Z != X + Y.
//
// REPORTE ORIGINAL: changelog do standalone, 2026-05-05
//
// LOCAL: quote-builder-model.ts, dentro da funcao que monta `pricing`
//        pro proposalOption (procura por `subtotalFormatted`)
//
// MUDANCA:
//   ANTES:
//     subtotalFormatted: formatCurrency(pricing.subtotal, locale, currency)
//
//   DEPOIS (// FIX(uplift): subtotal exibido = subtotal - discount, pra
//   reconciliar com Tax e Total que ja eram pos-discount):
//     const subtotalAfterDiscount =
//       Number(pricing.subtotal || 0) - Math.abs(Number(discountAmount || 0))
//     subtotalFormatted: formatCurrency(subtotalAfterDiscount, locale, currency)
//
// IMPACTO: Cliente final ve as tres linhas batendo. Sem mudanca de schema.
// Validacao: somar `subtotalFormatted` + `taxAmountFormatted` ==
// `grandTotalFormatted` (a menos de centavos por arredondamento).

// =====================================================================
// PATCH 2 — EV capacity autofill on cover change
// =====================================================================
// CONTEXTO: Quando o operador trocava o cover EV no backoffice, o campo
// "EV battery capacity (kWh)" nao atualizava. Operador tinha que digitar
// manualmente, e geralmente errava (esquecia o DoD conservador de 80%).
//
// LOCAL: Acao do handler que troca `coverEvId` no BuilderDraft.
//        No standalone, vive no BackofficePage.jsx; no monorepo,
//        em proposal-builder.tsx (apps/backoffice).
//
// MUDANCA:
//   Apos `setCoverEvId(newId)`, chamar:
//     const presets = await fetchEvBatteryPresets()  // tRPC ou inject
//     const auto = getConservativeEvCapacityKwh(presets, newId)
//     if (auto != null && !draft.evCapacityManualOverride) {
//       setEvBatteryCapacityKwh(auto)
//     }
//
//   Adicionar flag `evCapacityManualOverride: boolean` ao BuilderDraft.
//   Setar true sempre que o operador digita manualmente o campo.
//   Resetar false quando o cover muda.
//
// IMPACTO: Reduz erro humano. Quem quer override manual, override.

// =====================================================================
// PATCH 3 — splitBatteryCountIntoStacks: respeitar maxModulesWithV2x
// =====================================================================
// CONTEXTO: A regra atual usa `maxPerStack = includesV2x ? 5 : 6`
// hardcoded. Mas o pricing_catalog.rules ja tem `maxModulesWithV2x` e
// `maxModules` — deveria usar o catalog pra nao ter drift quando o
// produto mudar de capacidade.
//
// LOCAL: proposal-state-model.ts, funcao `splitBatteryCountIntoStacks`
//
// MUDANCA:
//   ANTES:
//     const maxPerStack = includesV2x ? 5 : 6
//
//   DEPOIS (// FIX(uplift): pegar do catalog.rules):
//     const maxPerStack = includesV2x
//       ? (rules?.maxModulesWithV2x ?? 5)
//       : (rules?.maxModules ?? 6)
//
//   Para isso a fn precisa receber `rules` como parametro opcional.
//   Caller pega de `pricingCatalog.rules` no DB.
//
// IMPACTO: Quando lancar nova bateria de capacidade diferente ou novo
// controller que aguenta mais modulos, so atualiza o catalog — code nao
// muda. Hoje teria que mexer em codigo + rebuild.

// =====================================================================
// PATCH 4 — Source payload preservation no upsert
// =====================================================================
// CONTEXTO: Sempre que a proposta vem de origem externa (n8n, importer,
// Pipedrive sync), o payload bruto se perde. Quando algo da errado, nao
// da pra reconstruir o que chegou.
//
// LOCAL: tRPC procedure `create` em backoffice-proposals.ts
//
// MUDANCA: Aceitar `sourcePayload?: jsonbObject` no input schema.
// Persistir em `proposal.source_payload` (coluna ja adicionada por
// migration 0074).
//
// IMPACTO: Provenance preservada. Debugging viavel.

// =====================================================================
// PATCH 5 — Render model via VIEW
// =====================================================================
// CONTEXTO: tRPC.backofficeProposals.renderModel hoje monta o payload
// em JS chamando `buildProposalRenderModelFromLookup`. A migration 0074
// criou a VIEW `eos_proposal.proposal_runtime_payload` que ja monta
// tudo em SQL.
//
// MUDANCA OPCIONAL (perfomance + menos codigo JS):
//   ANTES:
//     const proposal = await db.query.proposal.findFirst(...)
//     const assetLookup = await db.query.assetLookupRow.findMany(...)
//     const renderModel = buildProposalRenderModelFromLookup(proposal, lookup)
//
//   DEPOIS:
//     const [{ payload }] = await db.execute(sql`
//       SELECT payload FROM eos_proposal.proposal_runtime_payload
//       WHERE id = ${input.id}
//     `)
//     return payload as ProposalRenderModel
//
// IMPACTO: 1 query em vez de 2. Render shape garantida pelo DB schema.
// Atencao: o cover asset + visual model ainda precisa de JS (asset-resolver),
// entao manter como fallback. Talvez expor a VIEW como fast-path pra
// listagens, e usar o builder JS pro single render detalhado.

export {}
