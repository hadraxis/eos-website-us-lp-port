/**
 * EV battery presets — capacidades nominais conservadoras por modelo.
 *
 * O autofill no quote builder usa estes valores quando o operador
 * troca o cover EV. Multiplica nominalKwh por depthOfDischarge (default 0.80)
 * para preencher o campo "EV battery capacity (kWh)" de forma conservadora.
 *
 * O operador pode sobrescrever o valor sempre.
 *
 * Fonte de dados: o monorepo carrega via:
 *   - DB: SELECT FROM eos_proposal.ev_battery_preset (autoritativo em prod)
 *   - JSON: packages/database/src/data/ev-battery-presets.json (seed/fallback)
 *
 * Este modulo so define os tipos + helpers puros. Carregamento fica
 * com o caller (tRPC procedure ou rota Next).
 */

export interface EvBatteryPreset {
  evId: string
  label: string
  trim?: string | null
  nominalKwh: number
}

export interface EvBatteryPresetSet {
  version: string
  depthOfDischarge: number
  presets: Record<string, EvBatteryPreset>
}

/**
 * Constroi um set de presets indexado por evId a partir de rows
 * (vindo do JSON ou do DB).
 */
export function buildEvBatteryPresetSet(input: {
  version: string
  depthOfDischarge?: number
  rows: Array<{
    evId: string
    label?: string
    trim?: string | null
    nominalKwh: number | string
  }>
}): EvBatteryPresetSet {
  const dod = Number(input.depthOfDischarge ?? 0.8)
  const presets: Record<string, EvBatteryPreset> = {}

  for (const row of input.rows) {
    if (!row?.evId) continue
    const nominal = Number(row.nominalKwh)
    if (!Number.isFinite(nominal) || nominal <= 0) continue

    presets[row.evId] = {
      evId: row.evId,
      label: row.label ?? row.evId,
      trim: row.trim ?? null,
      nominalKwh: nominal,
    }
  }

  return {
    version: input.version,
    depthOfDischarge: Number.isFinite(dod) && dod > 0 && dod <= 1 ? dod : 0.8,
    presets,
  }
}

/**
 * Calcula a capacidade conservadora (kWh) do EV pelo evId.
 * Retorna null se o evId nao esta mapeado.
 *
 * Math: floor(nominalKwh * depthOfDischarge), arredondado pra inteiro.
 */
export function getConservativeEvCapacityKwh(
  set: EvBatteryPresetSet,
  evId: string | null | undefined
): number | null {
  if (!evId) return null
  const preset = set.presets[evId]
  if (!preset) return null
  if (!Number.isFinite(preset.nominalKwh)) return null
  return Math.round(preset.nominalKwh * set.depthOfDischarge)
}

/**
 * Lista os presets ativos como array (pra dropdowns/UI).
 * Ordenado por label.
 */
export function listEvBatteryPresets(
  set: EvBatteryPresetSet
): EvBatteryPreset[] {
  return Object.values(set.presets).sort((a, b) =>
    a.label.localeCompare(b.label)
  )
}

/**
 * Checa se um evId tem preset. Util pro builder decidir se mostra
 * o autofill ou nao.
 */
export function hasEvBatteryPreset(
  set: EvBatteryPresetSet,
  evId: string | null | undefined
): boolean {
  if (!evId) return false
  return Boolean(set.presets[evId])
}
