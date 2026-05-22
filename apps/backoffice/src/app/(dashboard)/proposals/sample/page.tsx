import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { AssetLookupSource, ProposalState } from '@repo/proposal-engine'

import { SampleClient } from './sample-client'

/**
 * Sample preview route — shell server component.
 *
 * FIX(uplift): problem 2/3 — antes era 100% server, lia JSON e renderizava
 * sem ouvir o builder. Agora le os dois JSONs no servidor e passa pro
 * SampleClient, que hidrata draft do localStorage + renderiza o documento.
 *
 * Resultado: editar em /proposals/new + abrir /proposals/sample mostra o
 * mesmo draft (mesma key de localStorage). Em prod isso seria substituido
 * por /proposals/[id] consultando trpc.backofficeProposals.byId.
 */

const DATA_ROOT = join(
  process.cwd(),
  '..',
  '..',
  'packages',
  'database',
  'src',
  'data'
)

export default async function SampleProposalPage() {
  const [proposalRaw, lookupRaw, catalogRaw] = await Promise.all([
    readFile(join(DATA_ROOT, 'proposal.sample.json'), 'utf8'),
    readFile(join(DATA_ROOT, 'asset-lookup.json'), 'utf8'),
    readFile(join(DATA_ROOT, 'pricing-catalog.json'), 'utf8'),
  ])

  return (
    <SampleClient
      baseProposal={JSON.parse(proposalRaw) as ProposalState}
      lookupSource={JSON.parse(lookupRaw) as AssetLookupSource}
      pricingCatalog={JSON.parse(catalogRaw) as unknown}
    />
  )
}
