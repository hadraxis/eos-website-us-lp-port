/**
 * Seed do asset_lookup_row — fonte: src/data/asset-lookup.json
 *
 * Cobre 4 tipos:
 *   - layoutRecipe (panel-stack, panel-stack-v2x, panel-stack-stack, ...)
 *   - coverAsset (cover EVs por canonicalId — ford-f150-lightning, rivian-r1s, ...)
 *   - stackVisual (visual de bateria stack por batteryCount + v2x)
 *   - componentVisual (smart panel + outros componentes)
 *
 * Mirror editavel: src/data/asset-lookup.csv
 *
 * Roda: bun run db:seed:asset-lookup
 */

import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { and, eq } from 'drizzle-orm'

import { assetLookupRow } from './schemas/eos-proposal'
import { db } from './index'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DATA_PATH = join(__dirname, 'data', 'asset-lookup.json')

interface AssetLookupJson {
  version: string
  rows: Array<{
    entityType: string
    canonicalId: string
    assetRole?: string
    batteryCount?: number | null
    v2x?: boolean | null
    layoutRecipe?: string
    imageRef?: string
    displayLabel?: string
    captionTitle?: string
    captionBody?: string
    sortOrder?: number
    active?: boolean
    columnCount?: number | null
    ratioSpec?: string
    gapPx?: number | null
    align?: string
    maxBatteryCount?: number | null
  }>
}

async function main(): Promise<void> {
  console.log('[seed-asset-lookup] lendo', DATA_PATH)
  const raw = await readFile(DATA_PATH, 'utf8')
  const data = JSON.parse(raw) as AssetLookupJson

  // Desativa rows antigos da mesma versao (mantem dados pra rollback rapido)
  await db
    .update(assetLookupRow)
    .set({ active: false })
    .where(eq(assetLookupRow.lookupVersion, data.version))

  for (const row of data.rows) {
    await db
      .insert(assetLookupRow)
      .values({
        lookupVersion: data.version,
        entityType: row.entityType,
        canonicalId: row.canonicalId,
        assetRole: row.assetRole,
        batteryCount: row.batteryCount ?? undefined,
        v2x: row.v2x ?? undefined,
        layoutRecipe: row.layoutRecipe,
        imageRef: row.imageRef,
        displayLabel: row.displayLabel,
        captionTitle: row.captionTitle,
        captionBody: row.captionBody,
        columnCount: row.columnCount ?? undefined,
        ratioSpec: row.ratioSpec,
        gapPx: row.gapPx ?? undefined,
        align: row.align,
        maxBatteryCount: row.maxBatteryCount ?? undefined,
        sortOrder: row.sortOrder ?? 0,
        active: row.active ?? true,
        sourcePayload: row,
      })
      .onConflictDoUpdate({
        target: [
          assetLookupRow.lookupVersion,
          assetLookupRow.entityType,
          assetLookupRow.canonicalId,
        ],
        set: {
          assetRole: row.assetRole,
          batteryCount: row.batteryCount ?? undefined,
          v2x: row.v2x ?? undefined,
          layoutRecipe: row.layoutRecipe,
          imageRef: row.imageRef,
          displayLabel: row.displayLabel,
          captionTitle: row.captionTitle,
          captionBody: row.captionBody,
          columnCount: row.columnCount ?? undefined,
          ratioSpec: row.ratioSpec,
          gapPx: row.gapPx ?? undefined,
          align: row.align,
          maxBatteryCount: row.maxBatteryCount ?? undefined,
          sortOrder: row.sortOrder ?? 0,
          active: row.active ?? true,
          sourcePayload: row,
        },
      })
  }

  console.log(
    `[seed-asset-lookup] ${data.rows.length} rows seedados (versao ${data.version})`
  )
}

main().catch((err) => {
  console.error('[seed-asset-lookup] ERRO:', err)
  process.exit(1)
})
