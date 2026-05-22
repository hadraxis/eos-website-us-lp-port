// @ts-nocheck
/* Portado verbatim do standalone (src/lib/proposalDraftStorage.js). TypeScript strict checks suprimidos pra acelerar o uplift; converter incrementalmente quando ajustar a engine. */
export const QUOTE_STORAGE_KEY = 'eos-proposal-package-quote-draft-v3';

export function loadProposalDraft() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return JSON.parse(window.localStorage.getItem(QUOTE_STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function saveProposalDraft(state) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify(state));
}

export function clearProposalDraft() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(QUOTE_STORAGE_KEY);
}
