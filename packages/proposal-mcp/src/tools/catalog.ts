/**
 * Tools de catalogo: list_plans, get_catalog, price_config
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import {
  bundleTemplate,
  catalogItem,
  db,
  eq,
  pricingCatalog,
} from '../lib/db-adapter'

function text(content: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(content, null, 2) }],
  }
}

export function registerCatalogTools(server: McpServer): void {
  server.registerTool(
    'list_plans',
    {
      title: 'Listar planos (bundle templates)',
      description:
        'Retorna todos os bundle_templates do catalogo ativo: Essential, Plus, Pro, Premium, Ultimate + tier comercial. Inclui modules, controller count, defaults V2X.',
      inputSchema: {},
    },
    async () => {
      const catalog = await db.query.pricingCatalog.findFirst({
        where: eq(pricingCatalog.active, true),
        with: { bundleTemplates: true },
      })

      if (!catalog) {
        return text({ error: 'Nenhum catalogo ativo encontrado' })
      }

      return text({
        catalogVersion: catalog.version,
        plans: catalog.bundleTemplates.map((b) => ({
          id: b.templateKey,
          label: b.label,
          description: b.description,
          modules: b.modules,
          controllerCount: b.controllerCount,
          includeSmartPanel: b.includeSmartPanel,
          includeInstallationKit: b.includeInstallationKit,
          includeSensorKit: b.includeSensorKit,
          defaultV2xCount: b.defaultV2xCount,
        })),
      })
    }
  )

  server.registerTool(
    'get_catalog',
    {
      title: 'Pegar catalogo completo',
      description:
        'Retorna o pricing_catalog ativo com items, bundle_templates, charge_defaults, finance, rules.',
      inputSchema: {},
    },
    async () => {
      const catalog = await db.query.pricingCatalog.findFirst({
        where: eq(pricingCatalog.active, true),
        with: {
          items: { where: eq(catalogItem.enabled, true) },
          bundleTemplates: { where: eq(bundleTemplate.enabled ?? bundleTemplate.id, bundleTemplate.id) },
        },
      })

      if (!catalog) {
        return text({ error: 'Nenhum catalogo ativo encontrado' })
      }

      return text(catalog)
    }
  )

  server.registerTool(
    'price_config',
    {
      title: 'Pegar charge defaults + finance + rules',
      description:
        'Retorna so as 3 secoes de config do catalogo ativo (sem items/bundles).',
      inputSchema: {},
    },
    async () => {
      const catalog = await db.query.pricingCatalog.findFirst({
        where: eq(pricingCatalog.active, true),
      })

      if (!catalog) {
        return text({ error: 'Nenhum catalogo ativo encontrado' })
      }

      return text({
        version: catalog.version,
        chargeDefaults: catalog.chargeDefaults,
        finance: catalog.finance,
        rules: catalog.rules,
      })
    }
  )
}
