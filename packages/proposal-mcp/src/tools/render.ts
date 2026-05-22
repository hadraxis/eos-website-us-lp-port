/**
 * Tools de render: render_model (usa a VIEW SQL-as-API)
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { db, sql } from '../lib/db-adapter'

function text(content: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(content, null, 2) }],
  }
}

export function registerRenderTools(server: McpServer): void {
  server.registerTool(
    'render_model',
    {
      title: 'Pegar render model da proposta (via SQL view)',
      description:
        'Retorna o payload completo (meta + client + seller + system + pricing + narrative + terms + options) num unico JSON. Vem da view eos_proposal.proposal_runtime_payload — montado em SQL.',
      inputSchema: {
        id: z.string().uuid().optional(),
        proposalNumber: z.string().optional(),
      },
    },
    async ({ id, proposalNumber }) => {
      if (!id && !proposalNumber) {
        return text({ error: 'Forneca id ou proposalNumber' })
      }

      const rows = id
        ? await db.execute<{ payload: unknown }>(sql`
            SELECT payload FROM eos_proposal.proposal_runtime_payload
            WHERE id = ${id}::uuid
            LIMIT 1
          `)
        : await db.execute<{ payload: unknown }>(sql`
            SELECT payload FROM eos_proposal.proposal_runtime_payload
            WHERE proposal_number = ${proposalNumber}
            LIMIT 1
          `)

      const first = (rows as unknown as Array<{ payload: unknown }>)[0]
      if (!first) {
        return text({ error: 'Proposta nao encontrada' })
      }

      return text(first.payload)
    }
  )

  server.registerTool(
    'render_asset_lookup',
    {
      title: 'Pegar payload do asset lookup',
      description:
        'Retorna todas as rows ativas do asset_lookup (covers + layout recipes + stack visuals) num unico array JSON via view.',
      inputSchema: {
        version: z
          .string()
          .optional()
          .describe('Default: asset-lookup-v1'),
      },
    },
    async ({ version }) => {
      const rows = await db.execute<{ payload: unknown }>(sql`
        SELECT payload FROM eos_proposal.asset_lookup_payload
        WHERE lookup_version = ${version ?? 'asset-lookup-v1'}
        LIMIT 1
      `)

      const first = (rows as unknown as Array<{ payload: unknown }>)[0]
      if (!first) {
        return text({ error: 'Asset lookup nao encontrado' })
      }
      return text(first.payload)
    }
  )
}
