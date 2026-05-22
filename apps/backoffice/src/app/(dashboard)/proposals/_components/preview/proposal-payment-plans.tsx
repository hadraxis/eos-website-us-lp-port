/**
 * ProposalPaymentPlans — cards de payment plans.
 *
 * Cash (6 meses 0% interest) na esquerda + ate 2 finance plans.
 */

import {
  getVisiblePaymentPlans,
  type PaymentPlan,
  type ProposalPricing,
} from '@repo/proposal-engine'

interface PlanCard {
  term: string
  payment: string
  badge?: string
}

interface ProposalPaymentPlansProps {
  pricing: ProposalPricing
}

export function ProposalPaymentPlans({ pricing }: ProposalPaymentPlansProps) {
  const cashPlan: PlanCard | null =
    pricing.cashInstallmentLabel || pricing.cashInstallmentPayment
      ? {
          term: pricing.cashInstallmentLabel ?? '6 Months',
          payment: pricing.cashInstallmentPayment ?? '',
          badge: '0% interest',
        }
      : null

  const financeRaw = getVisiblePaymentPlans(pricing).slice(0, cashPlan ? 2 : 3)
  const financePlans: PlanCard[] = financeRaw.map((p: PaymentPlan) => ({
    term: p.term ?? '',
    payment: p.payment ?? '',
  }))

  const plans: PlanCard[] = [cashPlan, ...financePlans].filter(
    (p): p is PlanCard => p !== null
  )

  if (plans.length === 0) {
    return null
  }

  return (
    <section className="payment-plans">
      <p className="payment-plans__header">
        <strong>In-house payment plans</strong>
        <span className="payment-plans__subcopy">Subject to credit approval.</span>
      </p>
      <div className="payment-plans__grid" data-plan-count={plans.length}>
        {plans.map((plan) => (
          <article
            className="payment-plan-card"
            key={`${plan.term}-${plan.payment}`}
          >
            <p className="payment-plan-card__term-row">
              <span className="payment-plan-card__term">{plan.term}</span>
              {plan.badge ? (
                <span className="payment-plan-card__badge">{plan.badge}</span>
              ) : null}
            </p>
            <p className="payment-plan-card__payment">{plan.payment}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
