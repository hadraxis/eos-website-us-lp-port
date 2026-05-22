/**
 * Aplica todas as migrations em ./drizzle/ ao DATABASE_URL.
 *
 * Roda: bun run db:migrate
 *
 * Estrategia: aplica primeiro `0074_proposal_hardening.sql` raw (pra criar
 * schema + mover tabelas + adicionar VIEWs), depois usa drizzle-kit migrate
 * pra migrations geradas a partir do schema.ts.
 */

import 'dotenv/config'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Pool } from 'pg'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const MIGRATIONS_DIR = join(__dirname, '..', 'drizzle')

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL nao definido')
  }

  const pool = new Pool({ connectionString: databaseUrl })

  try {
    // Cria tabela _migrations interna se nao existir
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _proposal_uplift_migrations (
        filename text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `)

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith('.sql'))
      .sort()

    for (const filename of files) {
      const applied = await pool.query(
        'SELECT 1 FROM _proposal_uplift_migrations WHERE filename = $1',
        [filename]
      )
      if ((applied.rowCount ?? 0) > 0) {
        // eslint-disable-next-line no-console
        console.log(`[migrate] skip (ja aplicada): ${filename}`)
        continue
      }

      const sql = await readFile(join(MIGRATIONS_DIR, filename), 'utf8')
      // eslint-disable-next-line no-console
      console.log(`[migrate] aplicando: ${filename}`)
      await pool.query(sql)
      await pool.query(
        'INSERT INTO _proposal_uplift_migrations (filename) VALUES ($1)',
        [filename]
      )
    }

    // eslint-disable-next-line no-console
    console.log('[migrate] ok')
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[migrate] ERRO:', err)
  process.exit(1)
})
