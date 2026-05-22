/**
 * ProposalPricingSummary — subtotal + tax + total.
 *
 * FIX(uplift): Subtotal exibido = subtotal - discount (reconcilia com
 * Tax + Total que ja eram pos-discount). Garantido pelo quote-builder-model.
 */

import { hasPositiveAmount, type ProposalPricing } from '@repo/proposal-engine'

interface ProposalPricingSummaryProps {
  pricing: ProposalPricing
}

export function ProposalPricingSummary({ pricing }: ProposalPricingSummaryProps) {
  const hasTax = hasPositiveAmount(pricing.taxAmount)
  const rawTaxLabel = /estimated/i.test(pricing.taxLabel ?? '')
    ? pricing.taxLabel
    : `Estimated ${pricing.taxLabel ?? 'tax'}`
  const taxLabel = (rawTaxLabel ?? '')
    .replace(/\s+Houston rate/gi, '')
    .replace(/\(\s*(\d+(?:\.\d+)?)%\s*\)/, '($1%)')
  const totalLabel = /grand total/i.test(pricing.totalLabel ?? '')
    ? 'Total Cash Price'
    : pricing.totalLabel

  return (
    <section className="pricing-summary">
      <div className="pricing-summary__grid">
        <p>Subtotal</p>
        <p>{pricing.subtotalFormatted}</p>
        {hasTax ? (
          <>
            <p>{taxLabel}</p>
            <p>{pricing.taxAmountFormatted}</p>
          </>
        ) : null}
        <p className="pricing-summary__total-label">{totalLabel}</p>
        <p className="pricing-summary__total-value">{pricing.grandTotalFormatted}</p>
      </div>
    </section>
  )
}
