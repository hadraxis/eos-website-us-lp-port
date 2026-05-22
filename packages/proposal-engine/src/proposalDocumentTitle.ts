// @ts-nocheck
/* Portado verbatim do standalone (src/lib/proposalDocumentTitle.js). TypeScript strict checks suprimidos pra acelerar o uplift; converter incrementalmente quando ajustar a engine. */
function sanitizeTitlePart(value) {
  return String(value || '')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildProposalPdfTitle(state) {
  const clientName = sanitizeTitlePart(state?.client?.name);
  const documentNumber = sanitizeTitlePart(
    state?.meta?.quickbooksDocNumber ||
      state?.meta?.quickbooksEstimateId ||
      state?.meta?.proposalNumber
  );

  return [clientName, documentNumber].filter(Boolean).join(' ') || 'Eos Proposal';
}
