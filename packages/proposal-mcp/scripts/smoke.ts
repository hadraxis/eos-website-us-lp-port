#!/usr/bin/env bun
/**
 * smoke.ts — smoke test do MCP server stdio.
 *
 * Sobe o servidor via tsx, manda um JSON-RPC `tools/list` no stdin, le a
 * resposta no stdout. Conta as tools. Falha se < 14 ou se o servidor crashou
 * antes de responder.
 *
 * Roda offline (nao precisa de DB): tools/list e metadado puro, registrado
 * antes de qualquer query.
 *
 * Como rodar:
 *   bun run packages/proposal-mcp/scripts/smoke.ts
 */

import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const SERVER_PATH = resolve(__dirname, '..', 'src', 'index.ts')

const EXPECTED_MIN_TOOLS = 14
const TIMEOUT_MS = 15_000

const child = spawn('tsx', [SERVER_PATH], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    // DATABASE_URL pode estar vazio — tools/list nao usa
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://noop:noop@localhost:5432/noop',
  },
})

let stdout = ''
let stderr = ''
let resolved = false

const timeout = setTimeout(() => {
  if (!resolved) {
    console.error('[smoke] TIMEOUT — server nao respondeu em', TIMEOUT_MS, 'ms')
    console.error('[smoke] stderr:', stderr.slice(-500))
    child.kill('SIGKILL')
    process.exit(1)
  }
}, TIMEOUT_MS)

child.stdout?.on('data', (chunk: Buffer) => {
  stdout += chunk.toString()
  // procura resposta JSON-RPC com id=1
  const lines = stdout.split('\n')
  for (const line of lines) {
    if (!line.trim()) continue
    try {
      const msg = JSON.parse(line)
      if (msg.id === 1 && msg.result?.tools) {
        resolved = true
        clearTimeout(timeout)
        const toolNames = msg.result.tools.map((t: { name: string }) => t.name)
        console.log(`[smoke] ${toolNames.length} tools registradas:`)
        for (const n of toolNames) console.log(`  - ${n}`)
        child.kill('SIGTERM')
        if (toolNames.length < EXPECTED_MIN_TOOLS) {
          console.error(
            `[smoke] FAIL — esperado >= ${EXPECTED_MIN_TOOLS}, got ${toolNames.length}`
          )
          process.exit(1)
        }
        console.log(`[smoke] OK — >= ${EXPECTED_MIN_TOOLS} tools`)
        process.exit(0)
      }
    } catch {
      // ignora linhas nao-JSON (logs do servidor)
    }
  }
})

child.stderr?.on('data', (chunk: Buffer) => {
  stderr += chunk.toString()
})

child.on('error', (err) => {
  console.error('[smoke] spawn error:', err)
  process.exit(2)
})

child.on('exit', (code) => {
  if (!resolved) {
    console.error('[smoke] server saiu com codigo', code, 'sem responder')
    console.error('[smoke] stderr:', stderr.slice(-500))
    process.exit(1)
  }
})

// Envia initialize + tools/list
const initialize = {
  jsonrpc: '2.0',
  id: 0,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'smoke-test', version: '0.0.1' },
  },
}
const listTools = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {},
}

child.stdin?.write(JSON.stringify(initialize) + '\n')
child.stdin?.write(JSON.stringify(listTools) + '\n')
