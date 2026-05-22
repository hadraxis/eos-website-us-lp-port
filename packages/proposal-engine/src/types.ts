/**
 * Types compartilhados do proposal-engine.
 * Mirror do shape esperado pelos componentes de preview e tRPC routers.
 */

export interface ProposalMeta {
  documentTitle?: string
  proposalNumber?: string
  dateCreated?: string
  expirationDate?: string
  termsUrl?: string
  quickbooksEstimateId?: string
  quickbooksDocNumber?: string
  currency?: string
  locale?: string
}

export interface ProposalClient {
  id?: string
  pipedrivePersonId?: string
  quickbooksCustomerId?: string
  name?: string
  addressLines?: string[]
}

export interface ProposalSeller {
  name?: string
  phone?: string
  email?: string
  website?: string
  officePhone?: string
  supportEmail?: string
  facebook?: string
  instagram?: string
  linkedin?: string
}

export interface ProposalStack {
  batteryCount: number
  v2x: boolean
  position: string
}

export interface ProposalLineItem {
  id?: string
  itemKey?: string
  quantity?: string | number
  label: string
  description?: string
  condition?: string
  hidden?: boolean
  selected?: boolean
  included?: boolean
  enabled?: boolean
  present?: boolean
}

export interface ProposalSystem {
  heroTag?: string
  solutionLabel?: string
  presetId?: string
  evId?: string | null
  coverArtKey?: string
  title?: string
  summary?: string
  summaryLead?: string
  summaryTail?: string
  includesV2x?: boolean
  includeSmartPanel?: boolean
  includeInstallationKit?: boolean
  includeSensorKit?: boolean
  controllerCount?: number
  v2xModuleCount?: number
  v2xVehicleBackupHours?: number
  backupHours?: number
  stacks?: ProposalStack[]
  lineItems?: ProposalLineItem[]
}

export interface PaymentPlan {
  term?: string
  payment?: string
  apr?: string
  hidden?: boolean
  selected?: boolean
  included?: boolean
  enabled?: boolean
  present?: boolean
}

export interface ProposalPricing {
  subtotal?: number
  taxLabel?: string
  taxAmount?: number
  totalLabel?: string
  grandTotal?: number
  discount?: number
  discountAmount?: number
  cashDiscountAmount?: number
  discountLabel?: string
  discountFormatted?: string
  subtotalFormatted?: string
  taxAmountFormatted?: string
  grandTotalFormatted?: string
  cashInstallmentLabel?: string
  cashInstallmentPayment?: string
  paymentPlans?: PaymentPlan[]
}

export interface ProposalNarrative {
  summaryTitle?: string
  summaryParagraphs?: string[]
  siteDetailsTitle?: string
  siteDetails?: string[]
}

export interface ProposalSharing {
  shareToken?: string
  shareChannel?: string
  recipientRef?: string
  createdAt?: string
  paymentUrl?: string
  trackedLinks?: {
    websiteUrl?: string
    termsUrl?: string
    paymentUrl?: string
    brochureUrl?: string
  }
}

export interface NormalizedTerm {
  lead: string
  tail: string
}

export interface ProposalOption {
  id: string
  optionLabel: string
  system: ProposalSystem
  pricing: ProposalPricing
  terms: NormalizedTerm[]
  planId?: string
}

export interface ProposalState {
  meta?: ProposalMeta
  client?: ProposalClient
  seller?: ProposalSeller
  system?: ProposalSystem
  pricing?: ProposalPricing
  narrative?: ProposalNarrative
  standardInstallationTerms?: string[]
  v2xInstallationTerm?: string
  proposalOptions?: ProposalOption[]
  sharing?: ProposalSharing
}

export interface AssetLookupRow {
  entityType: 'layoutRecipe' | 'stackVisual' | 'componentVisual' | 'coverAsset'
  canonicalId: string
  active?: boolean
  batteryCount?: number | null
  v2x?: boolean | null
  layoutRecipe?: string | null
  imageRef?: string | null
  displayLabel?: string | null
  captionTitle?: string | null
  captionBody?: string | null
  columnCount?: number | null
  gapPx?: number | null
  maxBatteryCount?: number | null
  ratioSpec?: string | null
  align?: string | null
}

export interface AssetLookupSource {
  rows: AssetLookupRow[]
}

export interface AssetLookup {
  rows: AssetLookupRow[]
  byType: Record<string, AssetLookupRow[]>
  layoutRecipes: AssetLookupRow[]
  coverAssets: AssetLookupRow[]
  stackVisuals: AssetLookupRow[]
  componentVisuals: AssetLookupRow[]
}

export interface VisualItem {
  id: string
  assetRole: 'panel' | 'stack'
  v2x: boolean
  displayLabel?: string | null
  imageSrc: string
}

export interface LayoutRecipe {
  id: string
  ratios: number[]
  gapPx: number
  align: string
}

export interface OptionVisualModel {
  layoutRecipe: LayoutRecipe
  visualItems: VisualItem[]
  captionTitle: string
  captionBody: string
}

export interface RenderedOption extends ProposalOption {
  visualModel: OptionVisualModel
}

export interface ProposalRenderModel {
  proposal: ProposalState
  coverAsset: {
    canonicalId: string
    displayLabel: string
    imageSrc: string
  }
  options: RenderedOption[]
  primaryOption: RenderedOption | null
}
