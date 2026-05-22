/**
 * ProposalDocument — entry root do preview.
 *
 * Renderiza cover + uma solution page por proposal option.
 * Layout 1:1 com o standalone Vite/React.
 *
 * O CSS vem de ./proposal-print.css (importar uma vez na rota host).
 */

import type { ProposalRenderModel } from '@repo/proposal-engine'

import { ProposalCoverPage } from './proposal-cover-page'
import { ProposalSolutionPage } from './proposal-solution-page'

interface ProposalDocumentProps {
  renderModel: ProposalRenderModel
}

export function ProposalDocument({ renderModel }: ProposalDocumentProps) {
  return (
    <main className="proposal-document">
      <ProposalCoverPage
        proposal={renderModel.proposal}
        coverAsset={renderModel.coverAsset}
      />
      {renderModel.options.map((option, index) => (
        <ProposalSolutionPage
          key={option.id || index}
          option={option}
          termsUrl={renderModel.proposal.meta?.termsUrl}
          proposal={renderModel.proposal}
        />
      ))}
    </main>
  )
}
