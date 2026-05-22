import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { ProposalBuilder } from './builder'

/**
 * /proposals/new — Quote Builder page (operator UI).
 *
 * Server component: le sample + catalog + asset-lookup do filesystem,
 * passa pro client component ProposalBuilder.
 */

const DATA_ROOT = join(process.cwd(), '..', '..', 'packages', 'database', 'src', 'data')

export default async function NewProposalPage() {
  const [proposalRaw, lookupRaw, catalogRaw] = await Promise.all([
    readFile(join(DATA_ROOT, 'proposal.sample.json'), 'utf8'),
    readFile(join(DATA_ROOT, 'asset-lookup.json'), 'utf8'),
    readFile(join(DATA_ROOT, 'pricing-catalog.json'), 'utf8'),
  ])

  return (
    <ProposalBuilder
      initialProposalState={JSON.parse(proposalRaw)}
      pricingCatalog={JSON.parse(catalogRaw)}
      assetLookupSource={JSON.parse(lookupRaw)}
    />
  )
}
