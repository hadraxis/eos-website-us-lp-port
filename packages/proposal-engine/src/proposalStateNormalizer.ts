// @ts-nocheck
/* Portado verbatim do standalone (src/lib/proposalStateNormalizer.js). TypeScript strict checks suprimidos pra acelerar o uplift; converter incrementalmente quando ajustar a engine. */
import proposalSampleData from '../data/proposal.sample.data.json';
import { buildInitialProposalState } from './proposalStateModel';
import { loadProposalDraft } from './proposalDraftStorage';

export function getInitialProposalState() {
  return buildInitialProposalState(proposalSampleData, loadProposalDraft());
}

export function buildProposalStateFromPayload(payload, storedState = null) {
  return buildInitialProposalState(payload, storedState);
}
