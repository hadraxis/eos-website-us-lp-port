/**
 * Schema namespaced `eos_proposal` — espelha o padrao de `aurora.ts`.
 *
 * Por que namespace?
 * - Isola as tabelas do gerador de propostas do dump do schema `public`
 * - Permite VIEWS, triggers e CHECK constraints especificos sem poluir o resto
 * - Mantem o padrao ja aceito no repo (aurora usa pgSchema('aurora'))
 *
 * Migration acompanhante: drizzle/0074_proposal_hardening.sql
 *   - Cria o schema
 *   - Move as tabelas existentes de public.* para eos_proposal.*
 *   - Adiciona CHECK constraints, indices GIN, triggers, VIEWS, colunas source_payload
 *   - Cria a nova tabela ev_battery_preset
 */

import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  date,
  decimal,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { customer, plan, user } from '../schema'

// ============================================================
// Schema raiz
// ============================================================
export const eosProposalSchema = pgSchema('eos_proposal')

// ============================================================
// Enum de status (texto + CHECK constraint no SQL, mantem
// compatibilidade com o enum atual DRAFT|SENT|ACCEPTED|EXPIRED|VOID)
// ============================================================
export const PROPOSAL_STATUSES = [
  'DRAFT', // rascunho
  'SENT', // enviada
  'ACCEPTED', // aceita
  'EXPIRED', // expirada
  'VOID', // anulada
] as const

// ============================================================
// pricing_catalog — catalogo versionado de precos
// ============================================================
export const pricingCatalog = eosProposalSchema.table('pricing_catalog', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  version: text('version').notNull().unique(),
  sourceWorkbook: text('source_workbook'),
  chargeDefaults: jsonb('charge_defaults').notNull().default({}),
  finance: jsonb('finance').notNull().default({}),
  rules: jsonb('rules').notNull().default({}),
  /** Payload bruto da fonte (workbook, JSON, etc) — provenance */
  sourcePayload: jsonb('source_payload').notNull().default({}),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// ============================================================
// catalog_item — items individuais (bateria, controller, smart panel, v2x, ...)
// ============================================================
export const catalogItem = eosProposalSchema.table(
  'catalog_item',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    catalogId: uuid('catalog_id')
      .notNull()
      .references(() => pricingCatalog.id, { onDelete: 'cascade' }),
    itemKey: text('item_key').notNull(),
    label: text('label').notNull(),
    description: text('description'),
    workbookName: text('workbook_name'),
    quantityLabel: text('quantity_label'),
    cost: decimal('cost', { precision: 12, scale: 2 }).notNull().default('0'),
    landedCost: decimal('landed_cost', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    /** texto para precisao decimal extra (yours mantem '3060.204' em vez de truncar) */
    cashSell: text('cash_sell').notNull().default('0'),
    financeSell: text('finance_sell').notNull().default('0'),
    enabled: boolean('enabled').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    sourcePayload: jsonb('source_payload').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('catalog_item_unique_item_key').on(
      table.catalogId,
      table.itemKey
    ),
    index('catalog_item_item_key_idx').on(table.itemKey),
  ]
)

// ============================================================
// bundle_template — receitas de pacotes (Essential, Plus, Pro, ...)
// ============================================================
export const bundleTemplate = eosProposalSchema.table(
  'bundle_template',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    catalogId: uuid('catalog_id')
      .notNull()
      .references(() => pricingCatalog.id, { onDelete: 'cascade' }),
    templateKey: text('template_key').notNull(),
    label: text('label').notNull(),
    description: text('description'),
    modules: integer('modules').notNull().default(0),
    controllerCount: integer('controller_count').notNull().default(0),
    includeSmartPanel: boolean('include_smart_panel').notNull().default(true),
    includeInstallationKit: boolean('include_installation_kit')
      .notNull()
      .default(false),
    includeSensorKit: boolean('include_sensor_kit').notNull().default(false),
    defaultV2xCount: integer('default_v2x_count').notNull().default(0),
    sortOrder: integer('sort_order').notNull().default(0),
    sourcePayload: jsonb('source_payload').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('bundle_template_unique_template_key').on(
      table.catalogId,
      table.templateKey
    ),
    index('bundle_template_template_key_idx').on(table.templateKey),
  ]
)

// ============================================================
// asset_lookup_row — recipes de layout, covers, stack visuals
// ============================================================
export const assetLookupRow = eosProposalSchema.table(
  'asset_lookup_row',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    lookupVersion: text('lookup_version')
      .notNull()
      .default('asset-lookup-v1'),
    entityType: text('entity_type').notNull(),
    canonicalId: text('canonical_id').notNull(),
    assetRole: text('asset_role'),
    batteryCount: integer('battery_count'),
    v2x: boolean('v2x'),
    layoutRecipe: text('layout_recipe'),
    imageRef: text('image_ref'),
    displayLabel: text('display_label'),
    captionTitle: text('caption_title'),
    captionBody: text('caption_body'),
    columnCount: integer('column_count'),
    ratioSpec: text('ratio_spec'),
    gapPx: integer('gap_px'),
    align: text('align'),
    maxBatteryCount: integer('max_battery_count'),
    sortOrder: integer('sort_order').notNull().default(0),
    active: boolean('active').notNull().default(true),
    sourcePayload: jsonb('source_payload').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('asset_lookup_row_unique_canonical').on(
      table.lookupVersion,
      table.entityType,
      table.canonicalId
    ),
    index('asset_lookup_row_entity_idx').on(
      table.lookupVersion,
      table.entityType,
      table.active,
      table.sortOrder
    ),
  ]
)

// ============================================================
// ev_battery_preset — capacidades nominais de EVs (para autofill V2X)
// ============================================================
export const evBatteryPreset = eosProposalSchema.table(
  'ev_battery_preset',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    presetVersion: text('preset_version')
      .notNull()
      .default('ev-battery-presets-v1'),
    /** Identificador kebab-case do EV (ex: 'ford-f150-lightning') */
    evId: text('ev_id').notNull(),
    label: text('label').notNull(),
    trim: text('trim'),
    /** Capacidade nominal do pacote da base trim (kWh) */
    nominalKwh: decimal('nominal_kwh', { precision: 6, scale: 2 }).notNull(),
    /** Depth of discharge conservador — padrao 0.80 */
    depthOfDischarge: decimal('depth_of_discharge', {
      precision: 4,
      scale: 3,
    })
      .notNull()
      .default('0.800'),
    active: boolean('active').notNull().default(true),
    sourcePayload: jsonb('source_payload').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('ev_battery_preset_unique_ev').on(
      table.presetVersion,
      table.evId
    ),
    index('ev_battery_preset_active_idx').on(
      table.presetVersion,
      table.active
    ),
  ]
)

// ============================================================
// proposal — proposta principal (snapshot + draft do operador)
// ============================================================
export const proposal = eosProposalSchema.table(
  'proposal',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    proposalNumber: text('proposal_number').notNull().unique(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customer.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id').references(() => plan.id, {
      onDelete: 'restrict',
    }),
    pricingCatalogId: uuid('pricing_catalog_id').references(
      () => pricingCatalog.id,
      { onDelete: 'restrict' }
    ),
    /** DRAFT | SENT | ACCEPTED | EXPIRED | VOID — checado por CHECK no SQL */
    status: text('status').notNull().default('DRAFT'),

    // Metadados de documento
    documentTitle: text('document_title')
      .notNull()
      .default('Your Energy Solution Proposal'),
    dateCreated: date('date_created'),
    expirationDate: date('expiration_date'),
    termsUrl: text('terms_url'),
    /** Codigo ISO 4217 — checado por regex no SQL (^[A-Z]{3}$) */
    currency: text('currency').notNull().default('USD'),
    locale: text('locale').notNull().default('en-US'),

    // Snapshot do cliente
    clientName: text('client_name'),
    clientAddressLines: text('client_address_lines')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    pipedrivePersonId: text('pipedrive_person_id'),
    quickbooksCustomerId: text('quickbooks_customer_id'),
    quickbooksEstimateId: text('quickbooks_estimate_id'),
    quickbooksDocNumber: text('quickbooks_doc_number'),

    // Snapshots de conteudo (validados por jsonb_typeof no SQL)
    seller: jsonb('seller').notNull().default({}),
    system: jsonb('system').notNull().default({}),
    pricing: jsonb('pricing').notNull().default({}),
    narrative: jsonb('narrative').notNull().default({}),
    standardInstallationTerms: text('standard_installation_terms')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    v2xInstallationTerm: text('v2x_installation_term'),

    // Estado do builder (rascunho do operador) e opcoes renderizadas
    quoteBuilder: jsonb('quote_builder').notNull().default({}),
    proposalOptions: jsonb('proposal_options').notNull().default([]),

    /** Payload bruto de origem (importacao, n8n, etc) — provenance */
    sourcePayload: jsonb('source_payload').notNull().default({}),

    // Metadados internos
    notes: text('notes'),
    createdBy: uuid('created_by').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('proposal_customer_idx').on(table.customerId),
    index('proposal_status_idx').on(table.status, table.createdAt),
    index('proposal_quickbooks_idx').on(table.quickbooksCustomerId),
    index('proposal_client_name_idx').on(table.clientName),
    // GIN — permite jsonpath queries em system/pricing
    index('proposal_system_gin_idx').using('gin', table.system),
    index('proposal_pricing_gin_idx').using('gin', table.pricing),
  ]
)

// ============================================================
// proposal_share_link — link rastreavel para envio ao cliente
// ============================================================
export const proposalShareLink = eosProposalSchema.table(
  'proposal_share_link',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    proposalId: uuid('proposal_id').references(() => proposal.id, {
      onDelete: 'set null',
    }),
    proposalNumber: text('proposal_number').notNull(),
    shareToken: text('share_token').notNull().unique(),
    recipientRef: text('recipient_ref').notNull(),
    channel: text('channel').notNull().default('backoffice_manual'),
    createdBy: uuid('created_by').references(() => user.id, {
      onDelete: 'set null',
    }),
    defaultDestinationContext: jsonb('default_destination_context')
      .notNull()
      .default({}),
    lastClickedAt: timestamp('last_clicked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('proposal_share_link_proposal_idx').on(
      table.proposalNumber,
      table.createdAt
    ),
    index('proposal_share_link_recipient_idx').on(table.recipientRef),
  ]
)

// ============================================================
// proposal_share_event — eventos de click/view do share link
// ============================================================
export const proposalShareEvent = eosProposalSchema.table(
  'proposal_share_event',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    shareLinkId: uuid('share_link_id').references(() => proposalShareLink.id, {
      onDelete: 'cascade',
    }),
    proposalNumber: text('proposal_number').notNull(),
    shareToken: text('share_token').notNull(),
    eventType: text('event_type').notNull(),
    linkType: text('link_type'),
    destinationUrl: text('destination_url'),
    requestMeta: jsonb('request_meta').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('proposal_share_event_token_idx').on(
      table.shareToken,
      table.createdAt
    ),
    index('proposal_share_event_type_idx').on(
      table.eventType,
      table.createdAt
    ),
  ]
)

// ============================================================
// Relations
// ============================================================
export const pricingCatalogRelations = relations(
  pricingCatalog,
  ({ many }) => ({
    items: many(catalogItem),
    bundleTemplates: many(bundleTemplate),
    proposals: many(proposal),
  })
)

export const catalogItemRelations = relations(catalogItem, ({ one }) => ({
  catalog: one(pricingCatalog, {
    fields: [catalogItem.catalogId],
    references: [pricingCatalog.id],
  }),
}))

export const bundleTemplateRelations = relations(bundleTemplate, ({ one }) => ({
  catalog: one(pricingCatalog, {
    fields: [bundleTemplate.catalogId],
    references: [pricingCatalog.id],
  }),
}))

export const proposalRelations = relations(proposal, ({ one, many }) => ({
  customer: one(customer, {
    fields: [proposal.customerId],
    references: [customer.id],
  }),
  plan: one(plan, {
    fields: [proposal.planId],
    references: [plan.id],
  }),
  pricingCatalog: one(pricingCatalog, {
    fields: [proposal.pricingCatalogId],
    references: [pricingCatalog.id],
  }),
  createdByUser: one(user, {
    fields: [proposal.createdBy],
    references: [user.id],
  }),
  shareLinks: many(proposalShareLink),
}))

export const proposalShareLinkRelations = relations(
  proposalShareLink,
  ({ one, many }) => ({
    proposal: one(proposal, {
      fields: [proposalShareLink.proposalId],
      references: [proposal.id],
    }),
    createdByUser: one(user, {
      fields: [proposalShareLink.createdBy],
      references: [user.id],
    }),
    events: many(proposalShareEvent),
  })
)

export const proposalShareEventRelations = relations(
  proposalShareEvent,
  ({ one }) => ({
    shareLink: one(proposalShareLink, {
      fields: [proposalShareEvent.shareLinkId],
      references: [proposalShareLink.id],
    }),
  })
)
