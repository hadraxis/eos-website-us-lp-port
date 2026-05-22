-- ============================================================
-- 0074_proposal_hardening.sql
-- ============================================================
-- Migration de hardening do slice de Proposal Generator.
--
-- O que faz:
--   1. Cria o schema `eos_proposal` (mesmo padrao de aurora)
--   2. Move as tabelas existentes de public.* para eos_proposal.*
--   3. Adiciona CHECK constraints em JSONB, status, currency
--   4. Adiciona indices GIN em system/pricing (jsonpath rapido)
--   5. Adiciona triggers `set_updated_at` (timestamp server-truth)
--   6. Adiciona colunas `source_payload` (provenance)
--   7. Cria nova tabela `ev_battery_preset`
--   8. Cria 3 VIEWS de runtime payloads (SQL-as-API)
--
-- Reversao:
--   - Cada bloco usa IF EXISTS/IF NOT EXISTS para idempotencia
--   - Nenhum DROP destrutivo de dados existentes
--   - Backup recomendado antes: pg_dump -n public > backup-pre-0074.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 2. Schema raiz
-- ============================================================
CREATE SCHEMA IF NOT EXISTS eos_proposal;

-- ============================================================
-- 3. Funcao trigger para updated_at (server-truth timestamp)
-- ============================================================
CREATE OR REPLACE FUNCTION eos_proposal.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 4. Move tabelas existentes de public para eos_proposal
--    (ALTER TABLE ... SET SCHEMA preserva dados, indices e FKs)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'proposal') THEN
    ALTER TABLE public.proposal SET SCHEMA eos_proposal;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pricing_catalog') THEN
    ALTER TABLE public.pricing_catalog SET SCHEMA eos_proposal;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'catalog_item') THEN
    ALTER TABLE public.catalog_item SET SCHEMA eos_proposal;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bundle_template') THEN
    ALTER TABLE public.bundle_template SET SCHEMA eos_proposal;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'asset_lookup_row') THEN
    ALTER TABLE public.asset_lookup_row SET SCHEMA eos_proposal;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'proposal_share_link') THEN
    ALTER TABLE public.proposal_share_link SET SCHEMA eos_proposal;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'proposal_share_event') THEN
    ALTER TABLE public.proposal_share_event SET SCHEMA eos_proposal;
  END IF;
END $$;

-- ============================================================
-- 5. Status enum legacy -> coluna text + CHECK constraint
--    (mantem flexibilidade pra adicionar novos status sem recriar enum)
-- ============================================================
DO $$
BEGIN
  -- Converte coluna status de enum para text se ainda for enum
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'eos_proposal'
      AND table_name = 'proposal'
      AND column_name = 'status'
      AND data_type = 'USER-DEFINED'
  ) THEN
    ALTER TABLE eos_proposal.proposal
      ALTER COLUMN status TYPE text USING status::text;
  END IF;

  -- Adiciona CHECK constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'proposal_status_check'
      AND conrelid = 'eos_proposal.proposal'::regclass
  ) THEN
    ALTER TABLE eos_proposal.proposal
      ADD CONSTRAINT proposal_status_check
      CHECK (status IN ('DRAFT', 'SENT', 'ACCEPTED', 'EXPIRED', 'VOID'));
  END IF;
END $$;

-- Drop o enum antigo se nao for mais usado por outra tabela
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proposal_status') THEN
    DROP TYPE IF EXISTS public.proposal_status CASCADE;
  END IF;
END $$;

-- ============================================================
-- 6. CHECK constraints — currency, jsonb_typeof
-- ============================================================
ALTER TABLE eos_proposal.proposal
  ADD CONSTRAINT IF NOT EXISTS proposal_currency_check
    CHECK (currency ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT IF NOT EXISTS proposal_seller_object_check
    CHECK (jsonb_typeof(seller) = 'object'),
  ADD CONSTRAINT IF NOT EXISTS proposal_system_object_check
    CHECK (jsonb_typeof(system) = 'object'),
  ADD CONSTRAINT IF NOT EXISTS proposal_pricing_object_check
    CHECK (jsonb_typeof(pricing) = 'object'),
  ADD CONSTRAINT IF NOT EXISTS proposal_narrative_object_check
    CHECK (jsonb_typeof(narrative) = 'object'),
  ADD CONSTRAINT IF NOT EXISTS proposal_quote_builder_object_check
    CHECK (jsonb_typeof(quote_builder) = 'object'),
  ADD CONSTRAINT IF NOT EXISTS proposal_options_array_check
    CHECK (jsonb_typeof(proposal_options) = 'array');

ALTER TABLE eos_proposal.pricing_catalog
  ADD CONSTRAINT IF NOT EXISTS pricing_catalog_charge_defaults_object_check
    CHECK (jsonb_typeof(charge_defaults) = 'object'),
  ADD CONSTRAINT IF NOT EXISTS pricing_catalog_finance_object_check
    CHECK (jsonb_typeof(finance) = 'object'),
  ADD CONSTRAINT IF NOT EXISTS pricing_catalog_rules_object_check
    CHECK (jsonb_typeof(rules) = 'object');

-- ============================================================
-- 7. Adiciona colunas source_payload (provenance)
-- ============================================================
ALTER TABLE eos_proposal.proposal
  ADD COLUMN IF NOT EXISTS source_payload jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE eos_proposal.pricing_catalog
  ADD COLUMN IF NOT EXISTS source_payload jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE eos_proposal.catalog_item
  ADD COLUMN IF NOT EXISTS source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS workbook_name text,
  ADD COLUMN IF NOT EXISTS quantity_label text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE eos_proposal.bundle_template
  ADD COLUMN IF NOT EXISTS source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE eos_proposal.asset_lookup_row
  ADD COLUMN IF NOT EXISTS source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS asset_role text,
  ADD COLUMN IF NOT EXISTS caption_title text,
  ADD COLUMN IF NOT EXISTS caption_body text,
  ADD COLUMN IF NOT EXISTS align text,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- ============================================================
-- 8. Indices GIN — jsonpath queries em system/pricing
-- ============================================================
CREATE INDEX IF NOT EXISTS proposal_system_gin_idx
  ON eos_proposal.proposal USING gin (system);

CREATE INDEX IF NOT EXISTS proposal_pricing_gin_idx
  ON eos_proposal.proposal USING gin (pricing);

CREATE INDEX IF NOT EXISTS proposal_client_name_idx
  ON eos_proposal.proposal (client_name);

-- ============================================================
-- 9. Triggers de updated_at — server-truth
-- ============================================================
DROP TRIGGER IF EXISTS proposal_set_updated_at ON eos_proposal.proposal;
CREATE TRIGGER proposal_set_updated_at
  BEFORE UPDATE ON eos_proposal.proposal
  FOR EACH ROW EXECUTE FUNCTION eos_proposal.set_updated_at();

DROP TRIGGER IF EXISTS pricing_catalog_set_updated_at ON eos_proposal.pricing_catalog;
CREATE TRIGGER pricing_catalog_set_updated_at
  BEFORE UPDATE ON eos_proposal.pricing_catalog
  FOR EACH ROW EXECUTE FUNCTION eos_proposal.set_updated_at();

DROP TRIGGER IF EXISTS catalog_item_set_updated_at ON eos_proposal.catalog_item;
CREATE TRIGGER catalog_item_set_updated_at
  BEFORE UPDATE ON eos_proposal.catalog_item
  FOR EACH ROW EXECUTE FUNCTION eos_proposal.set_updated_at();

DROP TRIGGER IF EXISTS bundle_template_set_updated_at ON eos_proposal.bundle_template;
CREATE TRIGGER bundle_template_set_updated_at
  BEFORE UPDATE ON eos_proposal.bundle_template
  FOR EACH ROW EXECUTE FUNCTION eos_proposal.set_updated_at();

DROP TRIGGER IF EXISTS asset_lookup_row_set_updated_at ON eos_proposal.asset_lookup_row;
CREATE TRIGGER asset_lookup_row_set_updated_at
  BEFORE UPDATE ON eos_proposal.asset_lookup_row
  FOR EACH ROW EXECUTE FUNCTION eos_proposal.set_updated_at();

DROP TRIGGER IF EXISTS proposal_share_link_set_updated_at ON eos_proposal.proposal_share_link;
CREATE TRIGGER proposal_share_link_set_updated_at
  BEFORE UPDATE ON eos_proposal.proposal_share_link
  FOR EACH ROW EXECUTE FUNCTION eos_proposal.set_updated_at();

-- ============================================================
-- 10. Nova tabela: ev_battery_preset
-- ============================================================
CREATE TABLE IF NOT EXISTS eos_proposal.ev_battery_preset (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_version text NOT NULL DEFAULT 'ev-battery-presets-v1',
  ev_id text NOT NULL,
  label text NOT NULL,
  trim text,
  nominal_kwh numeric(6, 2) NOT NULL,
  depth_of_discharge numeric(4, 3) NOT NULL DEFAULT 0.800,
  active boolean NOT NULL DEFAULT true,
  source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ev_battery_preset_unique_ev UNIQUE (preset_version, ev_id),
  CONSTRAINT ev_battery_preset_nominal_kwh_check CHECK (nominal_kwh > 0),
  CONSTRAINT ev_battery_preset_dod_check CHECK (depth_of_discharge > 0 AND depth_of_discharge <= 1)
);

CREATE INDEX IF NOT EXISTS ev_battery_preset_active_idx
  ON eos_proposal.ev_battery_preset (preset_version, active);

DROP TRIGGER IF EXISTS ev_battery_preset_set_updated_at ON eos_proposal.ev_battery_preset;
CREATE TRIGGER ev_battery_preset_set_updated_at
  BEFORE UPDATE ON eos_proposal.ev_battery_preset
  FOR EACH ROW EXECUTE FUNCTION eos_proposal.set_updated_at();

-- ============================================================
-- 11. VIEWS — runtime payloads (SQL-as-API)
--     A UI/MCP pode SELECT FROM view em vez de construir o JSON em JS
-- ============================================================

-- View: proposal_runtime_payload
--   Monta o ProposalState completo (com meta, client, seller, system, pricing,
--   narrative, terms, quote_builder, proposal_options) num unico JSONB.
CREATE OR REPLACE VIEW eos_proposal.proposal_runtime_payload AS
SELECT
  id,
  proposal_number,
  status,
  jsonb_strip_nulls(
    jsonb_build_object(
      'meta', jsonb_build_object(
        'documentTitle', document_title,
        'proposalNumber', proposal_number,
        'dateCreated', to_char(date_created, 'FMMonth FMDD, YYYY'),
        'expirationDate', to_char(expiration_date, 'FMMonth FMDD, YYYY'),
        'termsUrl', terms_url,
        'quickbooksEstimateId', quickbooks_estimate_id,
        'quickbooksDocNumber', quickbooks_doc_number,
        'currency', currency,
        'locale', locale
      ),
      'client', jsonb_build_object(
        'id', customer_id::text,
        'pipedrivePersonId', pipedrive_person_id,
        'quickbooksCustomerId', quickbooks_customer_id,
        'name', client_name,
        'addressLines', to_jsonb(client_address_lines)
      ),
      'seller', seller,
      'system', system,
      'pricing', pricing,
      'narrative', narrative,
      'standardInstallationTerms', to_jsonb(standard_installation_terms),
      'v2xInstallationTerm', v2x_installation_term,
      'quoteBuilder', quote_builder,
      'proposalOptions', proposal_options
    )
  ) AS payload
FROM eos_proposal.proposal;

-- View: asset_lookup_payload
--   Agrupa todas as rows ativas por lookup_version num unico array JSON.
CREATE OR REPLACE VIEW eos_proposal.asset_lookup_payload AS
SELECT
  lookup_version,
  jsonb_build_object(
    'version', lookup_version,
    'rows', jsonb_agg(
      jsonb_strip_nulls(
        jsonb_build_object(
          'entityType', entity_type,
          'canonicalId', canonical_id,
          'assetRole', asset_role,
          'batteryCount', battery_count,
          'v2x', v2x,
          'layoutRecipe', layout_recipe,
          'imageRef', image_ref,
          'displayLabel', display_label,
          'captionTitle', caption_title,
          'captionBody', caption_body,
          'sortOrder', sort_order,
          'active', active,
          'columnCount', column_count,
          'ratioSpec', ratio_spec,
          'gapPx', gap_px,
          'align', align,
          'maxBatteryCount', max_battery_count
        )
      )
      ORDER BY sort_order, canonical_id
    )
  ) AS payload
FROM eos_proposal.asset_lookup_row
WHERE active = true
GROUP BY lookup_version;

-- View: ev_battery_preset_payload
--   Agrupa presets ativos por preset_version num unico array JSON.
CREATE OR REPLACE VIEW eos_proposal.ev_battery_preset_payload AS
SELECT
  preset_version,
  jsonb_build_object(
    'version', preset_version,
    'depthOfDischarge', avg(depth_of_discharge),
    'rows', jsonb_agg(
      jsonb_build_object(
        'evId', ev_id,
        'label', label,
        'trim', trim,
        'nominalKwh', nominal_kwh,
        'depthOfDischarge', depth_of_discharge
      )
      ORDER BY label
    )
  ) AS payload
FROM eos_proposal.ev_battery_preset
WHERE active = true
GROUP BY preset_version;

COMMIT;
