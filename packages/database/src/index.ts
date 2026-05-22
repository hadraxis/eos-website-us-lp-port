/**
 * @repo/database — Drizzle client + barrel de schemas.
 *
 * Single source of truth para o cliente postgres. Tudo importa daqui:
 *   import { db, proposal, customer } from '@repo/database'
 */

import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from './schema'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error(
    '[@repo/database] DATABASE_URL nao definido. Veja .env.example na raiz.'
  )
}

export const pool = new Pool({ connectionString: databaseUrl })
export const db = drizzle(pool, { schema })

// Re-export operators do drizzle pra conveniencia
export { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm'

// Re-export schemas
export * from './schema'
