/**
 * ProposalSolutionPage — pagina(s) 2+ da proposta.
 *
 * Uma por ProposalOption (Essential / Plus / Pro / etc).
 * Header (logo + variant), hero (titulo + summary), line items table,
 * pricing summary, payment plans, visual composition, terms block.
 */

import type { ProposalState, RenderedOption } from '@repo/proposal-engine'

import { ProposalLineItemsTable } from './proposal-line-items-table'
import { ProposalPaymentPlans } from './proposal-payment-plans'
import { ProposalPricingSummary } from './proposal-pricing-summary'
import { ProposalTermsBlock } from './proposal-terms-block'
import { ProposalVisualComposition } from './proposal-visual-composition'

interface ProposalSolutionPageProps {
  option: RenderedOption
  termsUrl?: string
  proposal: ProposalState
}

export function ProposalSolutionPage({
  option,
  termsUrl,
  proposal,
}: ProposalSolutionPageProps) {
  const title = option.system.title

  return (
    <section className="proposal-page solution-page">
      <header className="solution-page__header">
        <img
          className="solution-page__logo"
          src="/proposals/proposal-header-logo.png"
          alt="Eos"
        />
        <div className="solution-page__header-rail" />
        <div>
          <p className="solution-page__eyebrow">{option.system.solutionLabel}</p>
          <p className="solution-page__variant">
            {option.system.includesV2x ? 'WITH V2X MODULE' : 'WITHOUT V2X MODULE'}
          </p>
        </div>
      </header>

      <section className="solution-page__hero">
        <h2 className="solution-page__title">{title}</h2>
        <p className="solution-page__subtitle">
          {option.system.summaryLead}
          {option.system.summaryTail ? <span>{option.system.summaryTail}</span> : null}
        </p>
      </section>

      <ProposalLineItemsTable
        lineItems={option.system.lineItems ?? []}
        system={option.system}
      />
      <ProposalPricingSummary pricing={option.pricing} />
      <ProposalPaymentPlans pricing={option.pricing} />
      <ProposalVisualComposition visualModel={option.visualModel} />
      <ProposalTermsBlock
        terms={option.terms}
        termsUrl={termsUrl}
        proposal={proposal}
      />
    </section>
  )
}
