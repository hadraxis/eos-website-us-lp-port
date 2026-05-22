/**
 * Tools de EV battery presets: list_ev_presets, get_ev_capacity
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import {
  buildEvBatteryPresetSet,
  getConservativeEvCapacityKwh,
} from '@repo/proposal-engine'

import { and, db, eq, evBatteryPreset } from '../lib/db-adapter'

function text(content: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(content, null, 2) }],
  }
}

const DEFAULT_PRESET_VERSION = 'ev-battery-presets-v1'

async function loadPresets(version: string = DEFAULT_PRESET_VERSION) {
  const rows = await db
    .select()
    .from(evBatteryPreset)
    .where(
      and(
        eq(evBatteryPreset.presetVersion, version),
        eq(evBatteryPreset.active, true)
      )
    )

  return buildEvBatteryPresetSet({
    version,
    depthOfDischarge: Number(rows[0]?.depthOfDischarge ?? 0.8),
    rows: rows.map((r) => ({
      evId: r.evId,
      label: r.label,
      trim: r.trim,
      nominalKwh: Number(r.nominalKwh),
    })),
  })
}

export function registerEvPresetTools(server: McpServer): void {
  server.registerTool(
    'list_ev_presets',
    {
      title: 'Listar presets de EV',
      description:
        'Retorna todos os EVs com capacidade nominal mapeada. Use evId pra autofill conservador (nominalKwh * 0.80).',
      inputSchema: {
        version: z
          .string()
          .optional()
          .describe(`Versao do preset set (default: ${DEFAULT_PRESET_VERSION})`),
      },
    },
    async ({ version }) => {
      const set = await loadPresets(version ?? DEFAULT_PRESET_VERSION)
      return text({
        version: set.version,
        depthOfDischarge: set.depthOfDischarge,
        presets: Object.values(set.presets),
      })
    }
  )

  server.registerTool(
    'get_ev_capacity',
    {
      title: 'Calcular capacidade conservadora do EV',
      description:
        'Dado um evId, retorna a capacidade utilizavel conservadora (kWh) = nominalKwh * depthOfDischarge. Use pra autofill do campo "EV battery capacity" no quote builder.',
      inputSchema: {
        evId: z
          .string()
          .describe(
            "Identificador kebab-case do EV (ex: 'ford-f150-lightning', 'tesla-model-y')"
          ),
        version: z.string().optional(),
      },
    },
    async ({ evId, version }) => {
      const set = await loadPresets(version ?? DEFAULT_PRESET_VERSION)
      const capacity = getConservativeEvCapacityKwh(set, evId)

      if (capacity == null) {
        return text({
          error: `EV '${evId}' nao mapeado. Use list_ev_presets pra ver disponiveis.`,
        })
      }

      const preset = set.presets[evId]
      return text({
        evId,
        label: preset?.label,
        trim: preset?.trim,
        nominalKwh: preset?.nominalKwh,
        depthOfDischarge: set.depthOfDischarge,
        conservativeKwh: capacity,
      })
    }
  )
}
