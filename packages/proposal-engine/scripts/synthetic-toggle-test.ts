#!/usr/bin/env bun
/**
 * synthetic-toggle-test — varre TODO o espaco de toggles do BuilderDraft e
 * verifica invariantes do engine em cada combo.
 *
 * Roda puro em memoria: nao precisa de DB. Le sample.json + pricing-catalog.json
 * direto do FS, monta drafts sinteticos, computa state aplicado, checa:
 *
 *   I1 (Patch 1) Subtotal + Tax = Total (centavo-tolerante)
 *   I2 (Patch 3) Stacks honram catalog.rules.maxModules / maxModulesWithV2x
 *   I3           Round-trip: createBuilderDraftFromProposal(buildState(d)) ~= d
 *   I4           Pipeline nao lanca pra entrada valida
 *
 * Saida: contagem pass/fail + primeiro fail com snapshot pra debug.
 * Exit 1 em qualquer fail.
 *
 * Como rodar:
 *   cd packages/proposal-engine
 *   bun run scripts/synthetic-toggle-test.ts
 */

// @ts-nocheck — engine ports sao @ts-nocheck, herdamos aqui

import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  applyPresetToDraft,
  buildInitialProposalState,
  buildProposalStateFromBuilderDraft,
  createBuilderDraftFromProposal,
  splitBatteryCountIntoStacks,
} from '../src/index'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DATA_DIR = join(__dirname, '..', '..', 'database', 'src', 'data')

interface Failure {
  combo: Record<string, unknown>
  invariant: string
  detail: string
}

const failures: Failure[] = []
let passCount = 0
let totalCount = 0

function parseMoney(formatted: string): number {
  if (!formatted) return 0
  // remove tudo que nao for digit, ponto, virgula ou sinal
  const cleaned = String(formatted).replace(/[^\d.,-]/g, '')
  // assumindo locale en-US (virgula = thousand, ponto = decimal)
  const normalized = cleaned.replace(/,/g, '')
  const n = Number(normalized)
  return Number.isFinite(n) ? n : 0
}

function record(invariant: string, ok: boolean, combo: Record<string, unknown>, detail: string) {
  totalCount += 1
  if (ok) {
    passCount += 1
    return
  }
  failures.push({ combo, invariant, detail })
}

async function loadJson(file: string) {
  const raw = await readFile(join(DATA_DIR, file), 'utf-8')
  return JSON.parse(raw)
}

async function main() {
  const sample = await loadJson('proposal.sample.json')
  const catalog = await loadJson('pricing-catalog.json')
  const rules = catalog?.rules ?? {}

  const initialState = buildInitialProposalState(sample)
  const baseDraft = createBuilderDraftFromProposal(initialState, catalog)

  const presetIds: string[] = (catalog.planPresets || catalog.bundleTemplates || [])
    .map((p: { id: string }) => p.id)
  if (!presetIds.includes('custom')) presetIds.push('custom')

  const v2xOptions = [false, true]
  const discountConfigs = [
    { mode: 'fixed', value: 0 },
    { mode: 'fixed', value: 500 },
    { mode: 'percent', value: 10 },
  ]
  // LOOP A: cada preset com defaults proprios + toggle V2X + variacoes de discount.
  // Preset dita modules/controllers — nao sobrescrevemos pra nao quebrar a logica do preset.
  const comboGenerators: Array<() => { combo: Record<string, unknown>; draft: any }> = []
  for (const presetId of presetIds) {
    for (const includesV2x of v2xOptions) {
      for (const discount of discountConfigs) {
        comboGenerators.push(() => {
          const presetDraft = applyPresetToDraft(baseDraft, catalog, presetId)
          const draft = {
            ...presetDraft,
            includesV2x,
            v2xModuleCount: includesV2x
              ? Math.min(presetDraft.controllerCount || 1, presetDraft.batteryModules || 1)
              : 0,
            discountMode: discount.mode,
            discountValue: discount.value,
            evBatteryCapacityKwh: includesV2x ? 80 : 0,
          }
          return {
            combo: {
              loop: 'A',
              presetId,
              includesV2x,
              batteryModules: draft.batteryModules,
              controllerCount: draft.controllerCount,
              discountMode: discount.mode,
              discountValue: discount.value,
            },
            draft,
          }
        })
      }
    }
  }

  // LOOP B: preset=custom, varia batteryModules + controllerCount + V2X livremente.
  // Custom permite overrides — exercita split + stack-cap.
  // Filtro de validade: cada stack precisa de >= 1 bateria e <= maxPerStack.
  //   batteryModules >= controllerCount  (sem stack vazio)
  //   batteryModules <= maxPerStack * controllerCount  (engine clamps senao)
  for (const includesV2x of v2xOptions) {
    const maxPerStack = includesV2x
      ? Number(rules.maxModulesWithV2x ?? 5)
      : Number(rules.maxModules ?? 6)
    for (const batteryModules of [1, 3, 6, 9, 12]) {
      for (const controllerCount of [1, 2, 3]) {
        if (batteryModules < controllerCount) continue
        if (batteryModules > maxPerStack * controllerCount) continue
        comboGenerators.push(() => {
          const customDraft = applyPresetToDraft(baseDraft, catalog, 'custom')
          const draft = {
            ...customDraft,
            batteryModules,
            controllerCount,
            includesV2x,
            v2xModuleCount: includesV2x ? Math.min(controllerCount, batteryModules) : 0,
            evBatteryCapacityKwh: includesV2x ? 80 : 0,
            discountMode: 'fixed',
            discountValue: 0,
          }
          return {
            combo: { loop: 'B', presetId: 'custom', includesV2x, batteryModules, controllerCount },
            draft,
          }
        })
      }
    }
  }

  for (const gen of comboGenerators) {
    const { combo, draft: rawDraft } = gen()
    // O draft "raw" carrega `proposalOptions` do sample. Pra testar o estado
    // recem-aplicado (em vez do snapshot salvo), zeramos proposalOptions —
    // exatamente o que buildCurrentProposalOption faz internamente.
    const draft = { ...rawDraft, proposalOptions: [] }
    const includesV2x = Boolean(combo.includesV2x)
    const batteryModules = Number(combo.batteryModules || draft.batteryModules || 0)

    // ====== I4 — pipeline nao lanca ======
    let appliedState
    try {
      appliedState = buildProposalStateFromBuilderDraft({ ...initialState, proposalOptions: [] }, draft, catalog)
      record('I4_no_throw', true, combo, '')
    } catch (err) {
      record('I4_no_throw', false, combo, String(err))
      continue
    }

    const option = appliedState?.proposalOptions?.[0]
    if (!option) {
      record('I0_option_exists', false, combo, 'proposalOptions[0] undefined')
      continue
    }
    record('I0_option_exists', true, combo, '')

    // ====== I1 — reconciliacao subtotal + tax = total ======
    const subtotal = parseMoney(option.pricing?.subtotalFormatted)
    const tax = parseMoney(option.pricing?.taxAmountFormatted)
    const total = parseMoney(option.pricing?.grandTotalFormatted)
    const computed = subtotal + tax
    const diff = Math.abs(computed - total)
    record(
      'I1_reconcile_subtotal_tax_total',
      diff < 0.02,
      combo,
      `subtotal=${subtotal} tax=${tax} sum=${computed} total=${total} diff=${diff.toFixed(4)}`
    )

    // ====== I2 — stacks honram catalog.rules ======
    const stacks = option.system?.stacks ?? []
    const maxPerStack = includesV2x
      ? Number(rules.maxModulesWithV2x ?? 5)
      : Number(rules.maxModules ?? 6)
    const overflowStack = stacks.find((s: { batteryCount: number }) => s.batteryCount > maxPerStack)
    record(
      'I2_split_respects_catalog_rules',
      !overflowStack,
      combo,
      overflowStack
        ? `stack batteryCount=${overflowStack.batteryCount} > maxPerStack=${maxPerStack}`
        : `${stacks.length} stacks, max=${maxPerStack}`
    )

    // Sum de stacks bate com batteryModules pedido (quando >0)
    if (batteryModules > 0 && stacks.length > 0) {
      const stackSum = stacks.reduce(
        (acc: number, s: { batteryCount: number }) => acc + Number(s.batteryCount || 0),
        0
      )
      record(
        'I2b_stack_sum_equals_modules',
        stackSum === batteryModules,
        combo,
        `sum=${stackSum} modules=${batteryModules}`
      )
    }

    // ====== I3 — round-trip dos campos controlados ======
    try {
      const draft2 = createBuilderDraftFromProposal(appliedState, catalog)
      const controllableFields = ['includesV2x', 'batteryModules', 'controllerCount', 'v2xModuleCount']
      for (const field of controllableFields) {
        const a = draft[field as keyof typeof draft]
        const b = draft2[field as keyof typeof draft2]
        record(
          `I3_roundtrip_${field}`,
          a === b || Number(a) === Number(b),
          combo,
          `draft.${field}=${a} draft2.${field}=${b}`
        )
      }
    } catch (err) {
      record('I3_roundtrip', false, combo, `throw on reverse: ${err}`)
    }
  }

  // ====== I-direct: splitBatteryCountIntoStacks honra rules ======
  for (const includesV2x of [false, true]) {
    for (const n of [1, 6, 7, 12, 18]) {
      const stacks = splitBatteryCountIntoStacks(n, includesV2x, null, null, rules)
      const cap = includesV2x ? Number(rules.maxModulesWithV2x ?? 5) : Number(rules.maxModules ?? 6)
      const overflow = stacks.find((s: { batteryCount: number }) => s.batteryCount > cap)
      record(
        'I-direct_split_cap',
        !overflow,
        { n, includesV2x, cap },
        overflow ? `overflow batteryCount=${overflow.batteryCount}` : `${stacks.length} stacks ok`
      )
    }
  }

  // ====== Saida ======
  console.log(`\n=========================`)
  console.log(`Synthetic toggle test`)
  console.log(`=========================`)
  console.log(`Total assertions: ${totalCount}`)
  console.log(`Passed:           ${passCount}`)
  console.log(`Failed:           ${failures.length}`)
  console.log(`=========================\n`)

  if (failures.length > 0) {
    console.log(`First 5 failures:\n`)
    for (const f of failures.slice(0, 5)) {
      console.log(`  [${f.invariant}]`)
      console.log(`    combo: ${JSON.stringify(f.combo)}`)
      console.log(`    detail: ${f.detail}\n`)
    }
    process.exit(1)
  }

  console.log('All invariants hold.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Test runner crashed:', err)
  process.exit(2)
})
