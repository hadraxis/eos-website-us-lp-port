/**
 * Barrel do @repo/proposal-engine.
 *
 * Re-exporta types + funcoes runtime ported do standalone.
 * Os arquivos .ts em camelCase sao ports diretos (@ts-nocheck) — converter
 * incrementalmente quando refatorar.
 */

// Types
export type {
  AssetLookup,
  AssetLookupRow,
  AssetLookupSource,
  LayoutRecipe,
  NormalizedTerm,
  OptionVisualModel,
  PaymentPlan,
  ProposalClient,
  ProposalLineItem,
  ProposalMeta,
  ProposalNarrative,
  ProposalOption,
  ProposalPricing,
  ProposalRenderModel,
  ProposalSeller,
  ProposalSharing,
  ProposalStack,
  ProposalState,
  ProposalSystem,
  RenderedOption,
  VisualItem,
} from './types'

// Engine runtime (ports do standalone)
export { buildAssetLookup } from './assetLookupModel'
export { buildProposalRenderModel } from './assetResolver'
export { buildProposalRenderModelFromLookup } from './assetResolverCore'
export { resolveLayoutRecipe } from './layoutRecipeResolver'
export { buildProposalPdfTitle } from './proposalDocumentTitle'
export {
  getProposalLink,
  getRawProposalLinks,
  getProposalShareSummary,
  getTrackedProposalLinks,
} from './proposalShareLinks'
export {
  buildInitialProposalState,
  buildOptions,
  deepMerge,
  deriveStacks,
  normalizeEvId,
  normalizeOption,
  normalizePresetId,
  splitBatteryCountIntoStacks,
} from './proposalStateModel'
export {
  getVisibleLineItems,
  getVisiblePaymentPlans,
  hasPositiveAmount,
  hasSelectedLineItem,
  isExplicitlyOff,
  isToggleSelected,
  matchesCondition,
  shouldShowLineItem,
  shouldShowSmartPanelVisual,
  toFiniteNumber,
} from './proposalVisibility'
export {
  addDays,
  applyPresetToDraft,
  buildCurrentProposalOption,
  buildProposalNumber,
  buildProposalStateFromBuilderDraft,
  calculateUsageMetrics,
  createBuilderDraftFromProposal,
  getCoverAssetOptions,
  syncHomeUsageFromInput,
  fallbackPricingCatalog,
} from './quoteBuilderModel'

// EV battery presets (helper TS novo)
export {
  buildEvBatteryPresetSet,
  getConservativeEvCapacityKwh,
  hasEvBatteryPreset,
  listEvBatteryPresets,
  type EvBatteryPreset,
  type EvBatteryPresetSet,
} from './ev-battery-presets'

// Aurora bridge (integracao com aurora-engine)
export {
  buildProposalEmbeddingText,
  generateProposalNarrative,
  suggestCoverAsset,
  type AuroraIdeationFn,
  type AuroraImageMatch,
  type AuroraImageSearchFn,
  type AuroraNarrativeContext,
} from './aurora-bridge'
