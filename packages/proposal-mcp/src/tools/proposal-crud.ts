/**
 * Tools de CRUD da proposta: list, get, create, patch, delete
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import {
  and,
  db,
  desc,
  eq,
  ilike,
  proposal,
  PROPOSAL_STATUSES,
} from '../lib/db-adapter'

function text(content: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(content, null, 2) }],
  }
}

const proposalStatusSchema = z.enum(PROPOSAL_STATUSES as readonly [string, ...string[]])

export function registerProposalCrudTools(server: McpServer): void {
  server.registerTool(
    'list_proposals',
    {
      title: 'Listar propostas',
      description:
        'Retorna propostas paginadas. Filtros opcionais: status, search (em proposalNumber/clientName), customerId.',
      inputSchema: {
        status: proposalStatusSchema.optional(),
        search: z.string().optional(),
        customerId: z.string().uuid().optional(),
        limit: z.number().int().positive().max(100).optional(),
      },
    },
    async ({ status, search, customerId, limit }) => {
      const conditions = []
      if (status) conditions.push(eq(proposal.status, status))
      if (customerId) conditions.push(eq(proposal.customerId, customerId))
      if (search) {
        conditions.push(
          // OR entre proposal_number e client_name
          // Usando ilike pra busca case-insensitive
          ilike(proposal.clientName, `%${search}%`)
        )
      }

      const rows = await db
        .select({
          id: proposal.id,
          proposalNumber: proposal.proposalNumber,
          status: proposal.status,
          clientName: proposal.clientName,
          createdAt: proposal.createdAt,
          updatedAt: proposal.updatedAt,
          customerId: proposal.customerId,
        })
        .from(proposal)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(proposal.createdAt))
        .limit(limit ?? 25)

      return text({ count: rows.length, proposals: rows })
    }
  )

  server.registerTool(
    'get_proposal',
    {
      title: 'Pegar uma proposta',
      description:
        'Retorna a proposta completa (todos os campos) por id ou proposalNumber.',
      inputSchema: {
        id: z.string().uuid().optional(),
        proposalNumber: z.string().optional(),
      },
    },
    async ({ id, proposalNumber }) => {
      if (!id && !proposalNumber) {
        return text({ error: 'Forneca id ou proposalNumber' })
      }

      const row = await db.query.proposal.findFirst({
        where: id ? eq(proposal.id, id) : eq(proposal.proposalNumber, proposalNumber!),
      })

      if (!row) {
        return text({ error: 'Proposta nao encontrada' })
      }

      return text(row)
    }
  )

  server.registerTool(
    'create_proposal',
    {
      title: 'Criar proposta',
      description:
        'Cria uma proposta nova. Aceita um payload parcial — campos faltantes usam default. Use sourcePayload pra preservar provenance (n8n, pipedrive, importer).',
      inputSchema: {
        proposalNumber: z.string(),
        customerId: z.string().uuid(),
        documentTitle: z.string().optional(),
        clientName: z.string().optional(),
        clientAddressLines: z.array(z.string()).optional(),
        quickbooksCustomerId: z.string().optional(),
        pipedrivePersonId: z.string().optional(),
        seller: z.record(z.unknown()).optional(),
        system: z.record(z.unknown()).optional(),
        pricing: z.record(z.unknown()).optional(),
        narrative: z.record(z.unknown()).optional(),
        quoteBuilder: z.record(z.unknown()).optional(),
        proposalOptions: z.array(z.unknown()).optional(),
        notes: z.string().optional(),
        sourcePayload: z
          .record(z.unknown())
          .optional()
          .describe('Payload bruto da origem — preservado em proposal.source_payload'),
      },
    },
    async (input) => {
      const [row] = await db
        .insert(proposal)
        .values({
          ...input,
          clientAddressLines: input.clientAddressLines ?? [],
        })
        .returning()
      return text({ created: row })
    }
  )

  server.registerTool(
    'patch_proposal',
    {
      title: 'Atualizar proposta (patch parcial)',
      description: 'Atualiza so os campos fornecidos. Use pra mudar status, system, pricing etc.',
      inputSchema: {
        id: z.string().uuid(),
        status: proposalStatusSchema.optional(),
        documentTitle: z.string().optional(),
        clientName: z.string().optional(),
        seller: z.record(z.unknown()).optional(),
        system: z.record(z.unknown()).optional(),
        pricing: z.record(z.unknown()).optional(),
        narrative: z.record(z.unknown()).optional(),
        quoteBuilder: z.record(z.unknown()).optional(),
        proposalOptions: z.array(z.unknown()).optional(),
        notes: z.string().optional(),
      },
    },
    async ({ id, ...patch }) => {
      const [row] = await db
        .update(proposal)
        .set(patch)
        .where(eq(proposal.id, id))
        .returning()

      if (!row) {
        return text({ error: 'Proposta nao encontrada' })
      }
      return text({ updated: row })
    }
  )

  server.registerTool(
    'delete_proposal',
    {
      title: 'Deletar proposta',
      description:
        'Deleta uma proposta. CUIDADO: irreversivel. Considere marcar status=VOID em vez de deletar.',
      inputSchema: { id: z.string().uuid() },
    },
    async ({ id }) => {
      const [row] = await db
        .delete(proposal)
        .where(eq(proposal.id, id))
        .returning({ id: proposal.id, proposalNumber: proposal.proposalNumber })
      if (!row) {
        return text({ error: 'Proposta nao encontrada' })
      }
      return text({ deleted: row })
    }
  )
}
