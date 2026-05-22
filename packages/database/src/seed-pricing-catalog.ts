/**
 * Seed do pricing_catalog — fonte unica: src/data/pricing-catalog.json
 *
 * Origem: workbook "Eos-e - Descricao dos Planos (2).xlsx" (page-3-pricing-config)
 * Versao seedada: pricing-admin-v2
 *
 * 6 catalog_items (bateria, controller, smart-panel, v2x, installation-kit, sensor-kit)
 * 10 bundle_templates (5 residenciais + 5 comerciais)
 *
 * Roda: bun run db:seed:pricing
 */

import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { eq } from 'drizzle-orm'

import {
  bundleTemplate,
  catalogItem,
  pricingCatalog,
} from './schemas/eos-proposal'
import { db } from './index'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DATA_PATH = join(__dirname, 'data', 'pricing-catalog.json')

interface PricingJson {
  version: string
  sourceWorkbook?: string
  catalogItems: Array<{
    id: string
    label: string
    workbookName?: string
    quantityLabel?: string
    description?: string
    cost: number
    landedCost: number
    cashSell: number
    financeSell: number
    enabled?: boolean
  }>
  bundleTemplates: Array<{
    id: string
    label: string
    description?: string
    modules: number
    controllerCount: number
    includeSmartPanel?: boolean
    includeInstallationKit?: boolean
    includeSensorKit?: boolean
    defaultV2xCount: number
  }>
  chargeDefaults: Record<string, unknown>
  finance: Record<string, unknown>
  rules: Record<string, unknown>
}

async function main(): Promise<void> {
  console.log('[seed-pricing-catalog] lendo', DATA_PATH)
  const raw = await readFile(DATA_PATH, 'utf8')
  const data = JSON.parse(raw) as PricingJson

  // Desativa catalogos antigos com o mesmo numero major (mantem historico)
  await db
    .update(pricingCatalog)
    .set({ active: false })
    .where(eq(pricingCatalog.active, true))

  // Upsert do catalogo
  const [catalog] = await db
    .insert(pricingCatalog)
    .values({
      version: data.version,
      sourceWorkbook: data.sourceWorkbook,
      chargeDefaults: data.chargeDefaults,
      finance: data.finance,
      rules: data.rules,
      sourcePayload: data,
      active: true,
    })
    .onConflictDoUpdate({
      target: pricingCatalog.version,
      set: {
        sourceWorkbook: data.sourceWorkbook,
        chargeDefaults: data.chargeDefaults,
        finance: data.finance,
        rules: data.rules,
        sourcePayload: data,
        active: true,
      },
    })
    .returning()

  if (!catalog) {
    throw new Error('Falha ao upsertar pricing_catalog')
  }

  console.log('[seed-pricing-catalog] catalog id:', catalog.id, 'version:', catalog.version)

  // Limpa items + bundles antigos do catalog (cascade fica feio com onConflict)
  await db.delete(catalogItem).where(eq(catalogItem.catalogId, catalog.id))
  await db
    .delete(bundleTemplate)
    .where(eq(bundleTemplate.catalogId, catalog.id))

  // Insert catalog items
  let itemSortOrder = 0
  for (const item of data.catalogItems) {
    await db.insert(catalogItem).values({
      catalogId: catalog.id,
      itemKey: item.id,
      label: item.label,
      description: item.description,
      workbookName: item.workbookName,
      quantityLabel: item.quantityLabel,
      cost: String(item.cost),
      landedCost: String(item.landedCost),
      cashSell: String(item.cashSell),
      financeSell: String(item.financeSell),
      enabled: item.enabled ?? true,
      sortOrder: itemSortOrder++,
      sourcePayload: item,
    })
  }
  console.log(`[seed-pricing-catalog] ${data.catalogItems.length} catalog_items inseridos`)

  // Insert bundle templates
  let bundleSortOrder = 0
  for (const bundle of data.bundleTemplates) {
    await db.insert(bundleTemplate).values({
      catalogId: catalog.id,
      templateKey: bundle.id,
      label: bundle.label,
      description: bundle.description,
      modules: bundle.modules,
      controllerCount: bundle.controllerCount,
      includeSmartPanel: bundle.includeSmartPanel ?? true,
      includeInstallationKit: bundle.includeInstallationKit ?? false,
      includeSensorKit: bundle.includeSensorKit ?? false,
      defaultV2xCount: bundle.defaultV2xCount,
      sortOrder: bundleSortOrder++,
      sourcePayload: bundle,
    })
  }
  console.log(
    `[seed-pricing-catalog] ${data.bundleTemplates.length} bundle_templates inseridos`
  )

  console.log('[seed-pricing-catalog] ok')
}

main().catch((err) => {
  console.error('[seed-pricing-catalog] ERRO:', err)
  process.exit(1)
})
