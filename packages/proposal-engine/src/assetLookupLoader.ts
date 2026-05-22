// @ts-nocheck
/* Portado verbatim do standalone (src/lib/assetLookupLoader.js). TypeScript strict checks suprimidos pra acelerar o uplift; converter incrementalmente quando ajustar a engine. */
import lookupSource from '../data/asset-lookup.json';
import { buildAssetLookup } from './assetLookupModel';

export function loadAssetLookup() {
  return buildAssetLookup(lookupSource);
}
