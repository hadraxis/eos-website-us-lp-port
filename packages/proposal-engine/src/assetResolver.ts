// @ts-nocheck
/* Portado verbatim do standalone (src/lib/assetResolver.js). TypeScript strict checks suprimidos pra acelerar o uplift; converter incrementalmente quando ajustar a engine. */
import { loadAssetLookup } from './assetLookupLoader';
import { buildAssetLookup } from './assetLookupModel';
import { buildProposalRenderModelFromLookup } from './assetResolverCore';

export function buildProposalRenderModel(proposalState, lookupSource = null) {
  const lookup = lookupSource ? buildAssetLookup(lookupSource) : loadAssetLookup();
  return buildProposalRenderModelFromLookup(lookup, proposalState);
}
