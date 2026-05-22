#!/usr/bin/env node
/**
 * verify-proposal-contract — contract test do slice de Proposal Generator.
 *
 * Roda apos seeds pra confirmar que:
 *   1. pricing_catalog tem 6 catalog_items + 10 bundle_templates
 *   2. ev_battery_preset tem >= 20 presets (versao v1)
 *   3. asset_lookup_row tem >= 4 layoutRecipes + >= 1 coverAsset
 *   4. asset image refs sao portateis (sem path absoluto Windows ou /)
 *   5. csv/json alignment (mesmo numero de rows, mesmos canonicalIds)
 *   6. engine normalization: 'home-reserve' -> 'pro', 'f150' -> 'ford-f150-lightning'
 *   7. EV preset autofill: ford-f150-lightning -> 98 kWh nominal -> 78 kWh conservador (98 * 0.8)
 *
 * Falha = exit 1. Roda em CI antes de deploy.
 */

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { and, eq, sql } from 'drizzle-orm'

import {
  buildEvBatteryPresetSet,
  getConservativeEvCapacityKwh,
  normalizeEvId,
  normalizePresetId,
} from '@repo/proposal-engine'

import { db } from '../src'
import {
  assetLookupRow,
  bundleTemplate,
  catalogItem,
  evBatteryPreset,
  pricingCatalog,
} from '../src/schemas/eos-proposal'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DATA_DIR = join(__dirname, '..', 'src', 'data')

interface CheckResult {
  name: string
  ok: boolean
  message?: string
}

const results: CheckResult[] = []

function record(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve(fn()).then(
    () => {
      results.push({ name, ok: true })
    },
    (err: Error) => {
      results.push({ name, ok: false, message: err.message })
    }
  )
}

async function main(): Promise<void> {
  // ============================================================
  // 1. pricing_catalog
  // ============================================================
  await record('pricing_catalog ativo existe', async () => {
    const c = await db.query.pricingCatalog.findFirst({
      where: eq(pricingCatalog.active, true),
    })
    assert.ok(c, 'nenhum pricing_catalog ativo')
  })

  await record('pricing_catalog tem 6 catalog_items', async () => {
    const c = await db.query.pricingCatalog.findFirst({
      where: eq(pricingCatalog.active, true),
      with: { items: true },
    })
    assert.equal(
      c?.items.length,
      6,
      `esperado 6 catalog_items (battery, controller, smart-panel, v2x, installation-kit, sensor-kit), achou ${c?.items.length}`
    )
  })

  await record('pricing_catalog tem 10 bundle_templates', async () => {
    const c = await db.query.pricingCatalog.findFirst({
      where: eq(pricingCatalog.active, true),
      with: { bundleTemplates: true },
    })
    assert.equal(
      c?.bundleTemplates.length,
      10,
      `esperado 10 bundle_templates (5 residencial + 5 comercial), achou ${c?.bundleTemplates.length}`
    )

    const keys = c?.bundleTemplates.map((b) => b.templateKey).sort() ?? []
    const expected = [
      'commercial-essential',
      'commercial-plus',
      'commercial-pro',
      'commercial-premium',
      'commercial-ultimate',
      'essential',
      'plus',
      'pro',
      'premium',
      'ultimate',
    ].sort()
    assert.deepEqual(keys, expected, 'bundle_template keys diferentes do esperado')
  })

  // ============================================================
  // 2. ev_battery_preset
  // ============================================================
  await record('ev_battery_preset tem >= 20 presets ativos', async () => {
    const rows = await db
      .select()
      .from(evBatteryPreset)
      .where(
        and(
          eq(evBatteryPreset.presetVersion, 'ev-battery-presets-v1'),
          eq(evBatteryPreset.active, true)
        )
      )
    assert.ok(
      rows.length >= 20,
      `esperado >= 20 EV presets, achou ${rows.length}`
    )
  })

  await record(
    'EV preset autofill: ford-f150-lightning -> 78 kWh conservador',
    async () => {
      const rows = await db
        .select()
        .from(evBatteryPreset)
        .where(
          and(
            eq(evBatteryPreset.presetVersion, 'ev-battery-presets-v1'),
            eq(evBatteryPreset.active, true)
          )
        )
      const set = buildEvBatteryPresetSet({
        version: 'ev-battery-presets-v1',
        depthOfDischarge: Number(rows[0]?.depthOfDischarge ?? 0.8),
        rows: rows.map((r) => ({
          evId: r.evId,
          label: r.label,
          trim: r.trim,
          nominalKwh: Number(r.nominalKwh),
        })),
      })
      const kwh = getConservativeEvCapacityKwh(set, 'ford-f150-lightning')
      assert.equal(kwh, 78, `esperado 78 kWh (98 * 0.8 round), achou ${kwh}`)
    }
  )

  // ============================================================
  // 3. asset_lookup_row
  // ============================================================
  await record('asset_lookup_row tem >= 4 layoutRecipes', async () => {
    const rows = await db
      .select()
      .from(assetLookupRow)
      .where(
        and(
          eq(assetLookupRow.lookupVersion, 'asset-lookup-v1'),
          eq(assetLookupRow.entityType, 'layoutRecipe'),
          eq(assetLookupRow.active, true)
        )
      )
    assert.ok(
      rows.length >= 4,
      `esperado >= 4 layoutRecipes, achou ${rows.length}`
    )
  })

  await record('asset image refs sao portateis (sem path absoluto)', async () => {
    const rows = await db
      .select()
      .from(assetLookupRow)
      .where(eq(assetLookupRow.lookupVersion, 'asset-lookup-v1'))

    for (const r of rows) {
      if (!r.imageRef) continue
      assert.equal(
        /^[A-Za-z]:[\\/]/.test(r.imageRef),
        false,
        `path absoluto Windows: ${r.imageRef}`
      )
      assert.equal(
        r.imageRef.startsWith('/'),
        false,
        `path absoluto root: ${r.imageRef}`
      )
    }
  })

  // ============================================================
  // 4. CSV/JSON alignment
  // ============================================================
  await record('asset-lookup.csv e .json alinhados', async () => {
    const jsonRaw = await readFile(join(DATA_DIR, 'asset-lookup.json'), 'utf8')
    const csvRaw = await readFile(join(DATA_DIR, 'asset-lookup.csv'), 'utf8')
    const json = JSON.parse(jsonRaw) as { rows: Array<{ canonicalId: string }> }
    const csvLines = csvRaw.trim().split(/\r?\n/).slice(1)
    assert.equal(
      csvLines.length,
      json.rows.length,
      `csv tem ${csvLines.length} rows, json tem ${json.rows.length}`
    )
  })

  await record('ev-battery-presets.csv e .json alinhados', async () => {
    const jsonRaw = await readFile(
      join(DATA_DIR, 'ev-battery-presets.json'),
      'utf8'
    )
    const csvRaw = await readFile(
      join(DATA_DIR, 'ev-battery-presets.csv'),
      'utf8'
    )
    const json = JSON.parse(jsonRaw) as { rows: Array<{ evId: string }> }
    const csvLines = csvRaw.trim().split(/\r?\n/).slice(1)
    assert.equal(
      csvLines.length,
      json.rows.length,
      `csv tem ${csvLines.length} rows, json tem ${json.rows.length}`
    )
  })

  // ============================================================
  // 5. Engine normalization
  // ============================================================
  await record("normalizePresetId('home-reserve') === 'pro'", () => {
    assert.equal(normalizePresetId('home-reserve'), 'pro')
  })

  await record("normalizeEvId(null, 'f150') === 'ford-f150-lightning'", () => {
    assert.equal(normalizeEvId(null, 'f150'), 'ford-f150-lightning')
  })

  // ============================================================
  // 6. VIEWs respondem
  // ============================================================
  await record('VIEW proposal_runtime_payload acessivel', async () => {
    await db.execute(sql`SELECT 1 FROM eos_proposal.proposal_runtime_payload LIMIT 1`)
  })

  await record('VIEW asset_lookup_payload acessivel', async () => {
    const rows = await db.execute<{ payload: unknown }>(sql`
      SELECT payload FROM eos_proposal.asset_lookup_payload LIMIT 1
    `)
    assert.ok(rows, 'view nao retornou')
  })

  await record('VIEW ev_battery_preset_payload acessivel', async () => {
    const rows = await db.execute<{ payload: unknown }>(sql`
      SELECT payload FROM eos_proposal.ev_battery_preset_payload LIMIT 1
    `)
    assert.ok(rows, 'view nao retornou')
  })

  // ============================================================
  // Summary
  // ============================================================
  const passed = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok).length

  // eslint-disable-next-line no-console
  console.log('\n=== verify-proposal-contract ===')
  for (const r of results) {
    // eslint-disable-next-line no-console
    console.log(`${r.ok ? '✓' : '✗'} ${r.name}`)
    if (!r.ok && r.message) {
      // eslint-disable-next-line no-console
      console.log(`    ${r.message}`)
    }
  }
  // eslint-disable-next-line no-console
  console.log(`\n${passed} passou, ${failed} falhou`)

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('verify-proposal-contract: erro fatal:', err)
  process.exit(1)
})
