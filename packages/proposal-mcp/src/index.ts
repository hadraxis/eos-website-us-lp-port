#!/usr/bin/env node
/**
 * @repo/proposal-mcp — MCP server stdio.
 *
 * Exposto pro Aurora (e qualquer LLM com cliente MCP) controlar o
 * Proposal Generator: catalogo, presets, CRUD de propostas, share links,
 * render model.
 *
 * Roda: bun run --cwd packages/proposal-mcp start
 *
 * Aurora config (exemplo, em packages/aurora-engine ou agent):
 *   {
 *     "name": "eos-proposal",
 *     "command": "bun",
 *     "args": ["run", "--cwd", "packages/proposal-mcp", "start"],
 *     "env": { "DATABASE_URL": "<...>" }
 *   }
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

import { registerCatalogTools } from './tools/catalog'
import { registerEvPresetTools } from './tools/ev-presets'
import { registerProposalCrudTools } from './tools/proposal-crud'
import { registerRenderTools } from './tools/render'
import { registerShareLinkTools } from './tools/share-links'

const server = new McpServer({
  name: 'eos-proposal',
  version: '0.1.0',
})

registerCatalogTools(server)
registerEvPresetTools(server)
registerProposalCrudTools(server)
registerRenderTools(server)
registerShareLinkTools(server)

// Health check tool — Aurora pode chamar pra confirmar conexao
server.registerTool(
  'health',
  {
    title: 'Health check',
    description: 'Confirma que o MCP server esta conectado no DB e respondendo.',
    inputSchema: {},
  },
  async () => {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ ok: true, server: 'eos-proposal', version: '0.1.0' }),
        },
      ],
    }
  }
)

const transport = new StdioServerTransport()
await server.connect(transport)

// eslint-disable-next-line no-console
console.error('[eos-proposal-mcp] stdio ready')

// Keep alive
process.on('SIGINT', () => {
  process.exit(0)
})
