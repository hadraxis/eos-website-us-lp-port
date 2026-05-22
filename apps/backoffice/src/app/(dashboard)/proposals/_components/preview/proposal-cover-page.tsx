/**
 * ProposalCoverPage — pagina 1 da proposta.
 *
 * Header (logo + meta), hero (titulo + cliente), arte (cover EV/default),
 * footer (seller + contatos + sociais com tracked links).
 *
 * Portado 1:1 do standalone Vite/React.
 */

import {
  getProposalLink,
  getRawProposalLinks,
  type ProposalRenderModel,
  type ProposalState,
} from '@repo/proposal-engine'

const SOCIAL_URLS = {
  facebook: 'https://www.facebook.com/join.eos',
  instagram: 'https://www.instagram.com/join.eos/',
  linkedin: 'https://www.linkedin.com/company/eospowerai/posts/',
} as const

type IconType = 'web' | 'phone' | 'mail' | 'doc' | 'facebook' | 'instagram' | 'linkedin'

const ICON_PATHS: Record<IconType, string> = {
  web: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.93 9h-3.18a15.5 15.5 0 0 0-1.05-5.05A8.02 8.02 0 0 1 18.93 11ZM12 4.04c.86 1.24 1.55 3.16 1.73 5.96h-3.46c.18-2.8.87-4.72 1.73-5.96ZM4.26 13h3.98c.1 2.04.46 3.8 1.02 5.05A8.03 8.03 0 0 1 4.26 13Zm3.98-2H4.26a8.03 8.03 0 0 1 5-5.05A15.5 15.5 0 0 0 8.24 11ZM12 19.96c-.86-1.24-1.55-3.16-1.73-5.96h3.46c-.18 2.8-.87 4.72-1.73 5.96Zm2.74-1.91A15.5 15.5 0 0 0 15.76 13h3.18a8.02 8.02 0 0 1-4.2 5.05Z',
  phone: 'M7.1 2.8 10 5.7 8.2 8c.8 1.7 2.1 3.1 3.8 3.8l2.3-1.8 2.9 2.9c.3.3.4.8.2 1.2l-1.3 3.1c-.2.5-.7.8-1.2.8C7.8 18 2 12.2 2 5.1c0-.5.3-1 .8-1.2l3.1-1.3c.4-.2.9-.1 1.2.2Z',
  mail: 'M3 5h18v14H3V5Zm2.4 2 6.6 5.1L18.6 7H5.4ZM5 9.3V17h14V9.3l-7 5.4-7-5.4Z',
  doc: 'M6 2h9l5 5v15H6V2Zm8 1.5V8h4.5L14 3.5ZM8 12h8v1.5H8V12Zm0 3h8v1.5H8V15Zm0 3h5v1.5H8V18Z',
  facebook:
    'M13.8 21v-7.5h2.5l.4-2.9h-2.9V8.8c0-.8.2-1.4 1.4-1.4h1.6V4.8c-.8-.1-1.6-.2-2.3-.2-2.3 0-3.9 1.4-3.9 4v2H8v2.9h2.6V21h3.2Z',
  instagram:
    'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm5.3-2.9a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Z',
  linkedin:
    'M5 8.8h3.2V21H5V8.8ZM6.6 3A1.9 1.9 0 1 1 6.5 6.8 1.9 1.9 0 0 1 6.6 3Zm4.1 5.8h3.1v1.7h.1c.4-.8 1.5-2 3.1-2 3.3 0 3.9 2.2 3.9 5V21h-3.2v-6.6c0-1.6 0-3.6-2.2-3.6s-2.6 1.7-2.6 3.5V21h-3.2V8.8Z',
}

function ContactIcon({ type }: { type: IconType }) {
  return (
    <span className="cover-page__contact-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path d={ICON_PATHS[type]} />
      </svg>
    </span>
  )
}

interface ProposalCoverPageProps {
  proposal: ProposalState
  coverAsset: ProposalRenderModel['coverAsset']
}

export function ProposalCoverPage({ proposal, coverAsset }: ProposalCoverPageProps) {
  const meta = proposal.meta ?? {}
  const client = proposal.client ?? {}
  const seller = proposal.seller ?? {}
  const system = proposal.system ?? {}

  const sellerName = /eos energy/i.test(seller.name ?? '') ? 'Eos Solar Inc.' : seller.name
  const trackedWebsiteUrl = getProposalLink(proposal, 'websiteUrl')
  const trackedPaymentUrl = getProposalLink(proposal, 'paymentUrl')
  const trackedBrochureUrl = getProposalLink(proposal, 'brochureUrl')
  const rawLinks = getRawProposalLinks(proposal)

  return (
    <section className="proposal-page cover-page">
      <header className="cover-page__header">
        <div className="cover-page__brand">
          <img className="cover-page__logo" src="/proposals/proposal-logo.png" alt="Eos" />
          <div className="cover-page__origin">
            <img src="/proposals/born-in-texas-icon.png" alt="" aria-hidden="true" />
            <span>{system.heroTag ?? 'Born in Texas'}</span>
          </div>
        </div>

        <div className="cover-page__meta">
          <p>Proposal date {meta.dateCreated}</p>
          <p>Valid through {meta.expirationDate}</p>
        </div>
      </header>

      <section className="cover-page__hero">
        <h1 className="cover-page__title">{meta.documentTitle}</h1>
        <div className="cover-page__client">
          <p>
            <strong>{client.name}</strong>
          </p>
          <p>Proposal {meta.proposalNumber}</p>
          {(client.addressLines ?? []).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </section>

      <section className="cover-page__art">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coverAsset.imageSrc} alt={coverAsset.displayLabel} />
      </section>

      <footer className="cover-page__footer">
        <div>
          <p>
            <strong>{sellerName}</strong>
          </p>
          <p>
            <strong>{seller.phone}</strong>
          </p>
          <p>
            <strong>{seller.email}</strong>
          </p>
        </div>

        <div className="contact-list">
          <a href={trackedWebsiteUrl ?? rawLinks.websiteUrl} target="_blank" rel="noreferrer">
            <ContactIcon type="web" />
            {seller.website}
          </a>
          <a href={`tel:${String(seller.officePhone ?? '').replace(/[^\d+]/g, '')}`}>
            <ContactIcon type="phone" />
            {seller.officePhone}
          </a>
          <a href={`mailto:${seller.supportEmail ?? ''}`}>
            <ContactIcon type="mail" />
            {seller.supportEmail}
          </a>
          {trackedPaymentUrl ? (
            <a href={trackedPaymentUrl} target="_blank" rel="noreferrer">
              <ContactIcon type="web" />
              Payment Link
            </a>
          ) : null}
          {trackedBrochureUrl ? (
            <a href={trackedBrochureUrl} target="_blank" rel="noreferrer">
              <ContactIcon type="doc" />
              Brochure
            </a>
          ) : null}
        </div>

        <div className="contact-list">
          <a href={SOCIAL_URLS.facebook} target="_blank" rel="noreferrer">
            <ContactIcon type="facebook" />
            {seller.facebook}
          </a>
          <a href={SOCIAL_URLS.instagram} target="_blank" rel="noreferrer">
            <ContactIcon type="instagram" />
            {seller.instagram}
          </a>
          <a href={SOCIAL_URLS.linkedin} target="_blank" rel="noreferrer">
            <ContactIcon type="linkedin" />
            {seller.linkedin}
          </a>
        </div>
      </footer>
    </section>
  )
}
