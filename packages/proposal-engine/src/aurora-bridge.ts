/**
 * Aurora bridge — helpers de integracao entre proposal-engine e aurora-engine.
 *
 * Aurora ja tem:
 *   - knowledge/brand + brandRules + journey + jtbd + playbooks
 *   - ideation/runIdeation (Gemini-backed)
 *   - asset-gen/searchLibrary (busca de assets em GCS)
 *   - embeddings (768d) pra similaridade
 *
 * Este modulo nao importa aurora-engine diretamente (mantem proposal-engine
 * com zero dependencias externas). Define os contratos que o caller resolve.
 *
 * Padrao de uso:
 *   - Caller (tRPC ou MCP) injeta as funcoes de aurora-engine
 *   - proposal-engine compoe e formata o output
 */

import type { ProposalState } from './types'

// ============================================================
// Contratos esperados do aurora-engine (injecao por dep)
// ============================================================

export interface AuroraNarrativeContext {
  /** Tom de voz do brand (ex: "amigavel, tecnico, sem jargao") */
  brandVoice: string
  /** Stage do customer journey (awareness, consideration, decision) */
  journeyStage?: string
  /** JTBD relevante (job-to-be-done) */
  jtbdJob?: string
}

export interface AuroraImageMatch {
  imageRef: string
  displayLabel: string
  score: number
  source: 'library' | 'generated'
}

export type AuroraIdeationFn = (input: {
  brief: string
  context: AuroraNarrativeContext
  maxParagraphs?: number
}) => Promise<{ paragraphs: string[]; titleSuggestion?: string }>

export type AuroraImageSearchFn = (input: {
  query: string
  filters?: { batteryCount?: number; v2x?: boolean; evId?: string }
  limit?: number
}) => Promise<AuroraImageMatch[]>

// ============================================================
// Gerador de narrativa via Aurora ideation
// ============================================================

/**
 * Gera os paragrafos de summary/narrative da proposta usando o tom de voz
 * do brand registrado no aurora.knowledge.brand.
 *
 * Caller injeta a fn `runIdeation` do aurora-engine.
 */
export async function generateProposalNarrative(
  state: ProposalState,
  ctx: AuroraNarrativeContext,
  runIdeation: AuroraIdeationFn
): Promise<{
  summaryTitle: string
  summaryParagraphs: string[]
}> {
  const totalBatteryKwh = Number(
    state.system?.lineItems?.find((i) => i.label === 'Battery')?.quantity ?? 0
  ) * 9 // 9 kWh por modulo
  const v2x = Boolean(state.system?.includesV2x)
  const backupHours = Number(
    state.system?.v2xVehicleBackupHours ?? state.system?.backupHours ?? 0
  )

  const brief = [
    `Cliente: ${state.client?.name ?? 'cliente'}`,
    `Endereco: ${state.client?.addressLines?.join(', ') ?? ''}`,
    `Sistema: ${totalBatteryKwh} kWh de bateria${v2x ? ' + V2X' : ''}`,
    backupHours > 0
      ? `Backup esperado: ate ${Math.round(backupHours)} horas`
      : '',
    `Plano: ${state.system?.title ?? state.system?.solutionLabel ?? 'custom'}`,
  ]
    .filter(Boolean)
    .join('\n')

  const result = await runIdeation({
    brief,
    context: ctx,
    maxParagraphs: 3,
  })

  return {
    summaryTitle:
      result.titleSuggestion ??
      state.narrative?.summaryTitle ??
      'Sua solucao de energia',
    summaryParagraphs: result.paragraphs,
  }
}

// ============================================================
// Sugestao de cover asset via Aurora library search
// ============================================================

/**
 * Sugere um cover asset adequado pro estado da proposta.
 *
 * Estrategia:
 *   1. Se evId esta setado, prioriza match exato
 *   2. Senao usa o totalBatteryCount + v2x como filtros de stackVisual
 *   3. Cai pro top-3 ranqueado por score
 */
export async function suggestCoverAsset(
  state: ProposalState,
  searchLibrary: AuroraImageSearchFn
): Promise<AuroraImageMatch[]> {
  const evId = state.system?.evId ?? undefined
  const totalBatteryCount = Number(
    state.system?.lineItems?.find((i) => i.label === 'Battery')?.quantity ?? 0
  )
  const v2x = Boolean(state.system?.includesV2x)

  if (evId) {
    return searchLibrary({
      query: `cover EV ${evId}`,
      filters: { evId },
      limit: 3,
    })
  }

  return searchLibrary({
    query: `stack visual ${totalBatteryCount} batteries${v2x ? ' v2x' : ''}`,
    filters: { batteryCount: totalBatteryCount, v2x },
    limit: 3,
  })
}

// ============================================================
// Embedding helper — pra similaridade entre propostas passadas
// ============================================================

/**
 * Constroi um texto canonico pra embedding de uma proposta.
 * Usado pelo aurora embeddings system pra achar propostas similares
 * (referencias historicas, pricing patterns, etc).
 */
export function buildProposalEmbeddingText(state: ProposalState): string {
  const parts = [
    state.system?.title,
    state.system?.summary,
    state.system?.solutionLabel,
    state.system?.presetId,
    state.system?.includesV2x ? 'with V2X' : 'without V2X',
    `${state.system?.lineItems?.length ?? 0} line items`,
    state.client?.name,
    state.client?.addressLines?.join(' '),
    state.narrative?.summaryParagraphs?.join(' '),
  ]
  return parts.filter(Boolean).join(' | ')
}
