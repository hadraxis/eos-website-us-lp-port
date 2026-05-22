'use client'

/**
 * SampleClient — ilha client da rota /proposals/sample.
 *
 * Le o draft persistido pelo builder em localStorage. Se nao houver draft,
 * cai no sample puro. Recomputa o render model a cada mudanca no draft.
 *
 * Cross-tab: o useDraftPersistence escuta storage events, entao editar em
 * uma tab atualiza a outra automaticamente.
 */

import { useMemo } from 'react'

import {
  buildAssetLookup,
  buildInitialProposalState,
  buildProposalRenderModelFromLookup,
  buildProposalStateFromBuilderDraft,
  createBuilderDraftFromProposal,
  type AssetLookupSource,
  type ProposalState,
} from '@repo/proposal-engine'

import { ProposalDocument } from '../_components/preview/proposal-document'
import '../_components/preview/proposal-print.css'

import { useDraftPersistence } from '../../../../hooks/use-draft-persistence'

interface Props {
  baseProposal: ProposalState
  lookupSource: AssetLookupSource
  pricingCatalog: unknown
}

export function SampleClient({ baseProposal, lookupSource, pricingCatalog }: Props) {
  const initialState = useMemo(() => buildInitialProposalState(baseProposal), [baseProposal])
  const initialDraft = useMemo(
    () => createBuilderDraftFromProposal(initialState),
    [initialState]
  )
  const lookup = useMemo(() => buildAssetLookup(lookupSource), [lookupSource])
  const { draft } = useDraftPersistence<any>(initialDraft)

  const appliedState = useMemo(
    () =>
      buildProposalStateFromBuilderDraft(
        { ...initialState, proposalOptions: [] },
        { ...draft, proposalOptions: [] },
        pricingCatalog as any
      ),
    [initialState, draft, pricingCatalog]
  )

  const renderModel = useMemo(
    () => buildProposalRenderModelFromLookup(lookup, appliedState),
    [lookup, appliedState]
  )

  return <ProposalDocument renderModel={renderModel} />
}
