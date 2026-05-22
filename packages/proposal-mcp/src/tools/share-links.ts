/**
 * Tools de share link: create_share_link, list_share_events
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'

import {
  and,
  db,
  desc,
  eq,
  proposalShareEvent,
  proposalShareLink,
} from '../lib/db-adapter'

function text(content: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(content, null, 2) }],
  }
}

function generateShareToken(): string {
  // 32 hex chars = 128 bits entropy. Url-safe.
  return randomBytes(16).toString('hex')
}

export function registerShareLinkTools(server: McpServer): void {
  server.registerTool(
    'create_share_link',
    {
      title: 'Criar share link rastreavel',
      description:
        'Gera um share token para uma proposta. recipientRef = identificador interno (email, pipedrivePersonId, etc) so pra correlation, nao vai pra URL final.',
      inputSchema: {
        proposalId: z.string().uuid().optional(),
        proposalNumber: z.string(),
        recipientRef: z.string(),
        channel: z
          .string()
          .optional()
          .describe('Ex: backoffice_manual, n8n_pipedrive_send, aurora_auto_send'),
        defaultDestinationContext: z.record(z.unknown()).optional(),
      },
    },
    async (input) => {
      const shareToken = generateShareToken()
      const [row] = await db
        .insert(proposalShareLink)
        .values({
          proposalId: input.proposalId,
          proposalNumber: input.proposalNumber,
          shareToken,
          recipientRef: input.recipientRef,
          channel: input.channel ?? 'backoffice_manual',
          defaultDestinationContext: input.defaultDestinationContext ?? {},
        })
        .returning()

      return text({
        shareToken,
        shareUrl: `/p/${shareToken}`,
        record: row,
      })
    }
  )

  server.registerTool(
    'list_share_events',
    {
      title: 'Listar eventos do share link',
      description:
        'Retorna eventos (click, view) de um share link. Use pra entender engagement do cliente com a proposta.',
      inputSchema: {
        shareToken: z.string().optional(),
        proposalNumber: z.string().optional(),
        limit: z.number().int().positive().max(200).optional(),
      },
    },
    async ({ shareToken, proposalNumber, limit }) => {
      if (!shareToken && !proposalNumber) {
        return text({ error: 'Forneca shareToken ou proposalNumber' })
      }

      const conditions = []
      if (shareToken) conditions.push(eq(proposalShareEvent.shareToken, shareToken))
      if (proposalNumber)
        conditions.push(eq(proposalShareEvent.proposalNumber, proposalNumber))

      const events = await db
        .select()
        .from(proposalShareEvent)
        .where(and(...conditions))
        .orderBy(desc(proposalShareEvent.createdAt))
        .limit(limit ?? 50)

      return text({ count: events.length, events })
    }
  )
}
