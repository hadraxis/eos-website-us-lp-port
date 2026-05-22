/**
 * Schema raiz — barrel + stubs minimos.
 *
 * O monorepo de destino (eosloan-turborepo) tem ~70 tabelas em public.
 * Aqui mantemos so o necessario pra rodar o slice de proposta standalone:
 *   - user, customer, plan (referenciadas como FK em eos_proposal.proposal)
 *
 * Em produc&atilde;o (apos aplicar no monorepo de destino), as tabelas reais
 * de public ja existem e o `export *` abaixo nao colide.
 */

import { relations, sql } from 'drizzle-orm'
import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

// ============================================================
// Tabelas stub minimas (apenas pra resolver FKs do eos-proposal schema)
// ============================================================

export const user = pgTable('user', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  email: text('email').unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const customer = pgTable('customer', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const plan = pgTable('plan', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  key: text('key').notNull().unique(),
  label: text('label').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const userRelations = relations(user, () => ({}))
export const customerRelations = relations(customer, () => ({}))
export const planRelations = relations(plan, () => ({}))

// ============================================================
// Re-export do schema namespaced eos_proposal
// ============================================================
export * from './schemas/eos-proposal'
