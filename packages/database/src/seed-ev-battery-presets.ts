/**
 * Seed do ev_battery_preset — fonte: src/data/ev-battery-presets.json
 *
 * Capacidades nominais do pacote base de cada EV (kWh).
 * Multiplicado por depth_of_discharge (default 0.80) para autofill
 * conservador do campo "EV battery capacity (kWh)" no quote builder.
 *
 * Mirror editavel: src/data/ev-battery-presets.csv
 *
 * Roda: bun run db:seed:ev-presets
 */

import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { eq } from 'drizzle-orm'

import { evBatteryPreset } from './schemas/eos-proposal'
import { db } from './index'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DATA_PATH = join(__dirname, 'data', 'ev-battery-presets.json')

interface EvPresetsJson {
  version: string
  depthOfDischarge: number
  notes?: string
  rows: Array<{
    evId: string
    label: string
    trim?: string
    nominalKwh: number
  }>
}

async function main(): Promise<void> {
  console.log('[seed-ev-battery-presets] lendo', DATA_PATH)
  const raw = await readFile(DATA_PATH, 'utf8')
  const data = JSON.parse(raw) as EvPresetsJson

  // Desativa presets antigos da mesma versao
  await db
    .update(evBatteryPreset)
    .set({ active: false })
    .where(eq(evBatteryPreset.presetVersion, data.version))

  for (const row of data.rows) {
    await db
      .insert(evBatteryPreset)
      .values({
        presetVersion: data.version,
        evId: row.evId,
        label: row.label,
        trim: row.trim,
        nominalKwh: String(row.nominalKwh),
        depthOfDischarge: String(data.depthOfDischarge),
        active: true,
        sourcePayload: row,
      })
      .onConflictDoUpdate({
        target: [evBatteryPreset.presetVersion, evBatteryPreset.evId],
        set: {
          label: row.label,
          trim: row.trim,
          nominalKwh: String(row.nominalKwh),
          depthOfDischarge: String(data.depthOfDischarge),
          active: true,
          sourcePayload: row,
        },
      })
  }

  console.log(
    `[seed-ev-battery-presets] ${data.rows.length} presets seedados (versao ${data.version})`
  )
}

main().catch((err) => {
  console.error('[seed-ev-battery-presets] ERRO:', err)
  process.exit(1)
})
