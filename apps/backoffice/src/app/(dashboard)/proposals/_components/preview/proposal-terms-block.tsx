/**
 * ProposalTermsBlock — terms & conditions com balanceamento de colunas.
 *
 * Algoritmo: ordena, dedupe, calcula peso por linha, encontra o split
 * mais balanceado entre esquerda/direita.
 */

import {
  getProposalLink,
  type NormalizedTerm,
  type ProposalState,
} from '@repo/proposal-engine'

const OFFICIAL_TERMS_URL =
  'https://www.eos-e.com/legal/Installation-Terms-and-Conditions.pdf'

function chunkTerms(terms: NormalizedTerm[]): [NormalizedTerm[], NormalizedTerm[]] {
  const uniqueTerms: NormalizedTerm[] = []
  const seen = new Set<string>()

  for (const term of terms) {
    const key = `${term.lead || ''}${term.tail || ''}`
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      uniqueTerms.push(term)
    }
  }

  if (uniqueTerms.length <= 2) {
    return [uniqueTerms.slice(0, 1), uniqueTerms.slice(1)]
  }

  const weights = uniqueTerms.map((term) => {
    const text = `${term.lead || ''}${term.tail || ''}`
      .replace(/\s+/g, ' ')
      .trim()
    return Math.max(1, Math.ceil(text.length / 58))
  })
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)

  let bestIndex = 1
  let bestDelta = Number.POSITIVE_INFINITY
  let leftWeight = 0

  for (let index = 1; index < uniqueTerms.length; index += 1) {
    leftWeight += weights[index - 1]!
    const rightWeight = totalWeight - leftWeight
    const delta = Math.abs(leftWeight - rightWeight)
    if (delta < bestDelta) {
      bestDelta = delta
      bestIndex = index
    }
  }

  return [uniqueTerms.slice(0, bestIndex), uniqueTerms.slice(bestIndex)]
}

interface ProposalTermsBlockProps {
  terms: NormalizedTerm[]
  termsUrl?: string
  proposal: ProposalState
}

export function ProposalTermsBlock({
  terms,
  termsUrl,
  proposal,
}: ProposalTermsBlockProps) {
  const [left, right] = chunkTerms(terms)
  const trackedTermsUrl = getProposalLink(proposal, 'termsUrl')
  const installationTermsUrl = /installation-terms$/i.test(
    String(termsUrl ?? '').replace(/\/$/, '')
  )
    ? OFFICIAL_TERMS_URL
    : trackedTermsUrl ?? termsUrl ?? OFFICIAL_TERMS_URL

  if (left.length + right.length === 0) {
    return null
  }

  return (
    <section className="terms-block">
      <a
        className="terms-block__heading"
        href={installationTermsUrl}
        target="_blank"
        rel="noreferrer"
      >
        Installation Terms and Conditions
      </a>
      <div className="terms-block__columns">
        <div>
          {left.map((term) => (
            <p key={term.lead + term.tail}>
              <strong>{term.lead}</strong>
              {term.tail}
            </p>
          ))}
        </div>
        <div>
          {right.map((term) => (
            <p key={term.lead + term.tail}>
              <strong>{term.lead}</strong>
              {term.tail}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}
