// @ts-nocheck
/* Portado verbatim do standalone (src/lib/proposalShareLinks.js). TypeScript strict checks suprimidos pra acelerar o uplift; converter incrementalmente quando ajustar a engine. */
export const DEFAULT_BROCHURE_URL =
  'https://eossolarloan1-my.sharepoint.com/:b:/g/personal/charles_atkins_eos-e_com/IQDB7O1QENmHQqFcVI_OIH6aAT9xcvYYBOEAZz6tdIbDl00?e=NOTikL';

function normalizeHttpUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  const candidate = /^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, '')}`;

  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return '';
    }
    return url.toString();
  } catch {
    return '';
  }
}

function cleanObject(value) {
  return Object.fromEntries(
    Object.entries(value || {}).filter(([, entry]) => entry !== undefined && entry !== null && entry !== '')
  );
}

export function getRawProposalLinks(proposal) {
  return cleanObject({
    websiteUrl: normalizeHttpUrl(proposal?.seller?.website || ''),
    termsUrl: normalizeHttpUrl(proposal?.meta?.termsUrl || ''),
    paymentUrl: normalizeHttpUrl(proposal?.sharing?.paymentUrl || ''),
    brochureUrl: normalizeHttpUrl(proposal?.meta?.brochureUrl || DEFAULT_BROCHURE_URL),
  });
}

export function getTrackedProposalLinks(proposal) {
  const raw = getRawProposalLinks(proposal);
  const tracked = proposal?.sharing?.trackedLinks || {};

  return cleanObject({
    websiteUrl: tracked.websiteUrl || raw.websiteUrl || '',
    termsUrl: tracked.termsUrl || raw.termsUrl || '',
    paymentUrl: tracked.paymentUrl || raw.paymentUrl || '',
    brochureUrl: tracked.brochureUrl || raw.brochureUrl || '',
  });
}

export function getProposalLink(proposal, linkKey) {
  const trackedLinks = getTrackedProposalLinks(proposal);
  return trackedLinks[linkKey] || '';
}

export function getProposalShareSummary(proposal) {
  if (!proposal?.sharing?.shareToken) {
    return null;
  }

  return {
    shareToken: proposal.sharing.shareToken,
    shareChannel: proposal.sharing.shareChannel || '',
    recipientRef: proposal.sharing.recipientRef || '',
    createdAt: proposal.sharing.createdAt || '',
  };
}
