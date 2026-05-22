/**
 * ProposalVisualComposition — grid de panel + stacks com layout recipe.
 *
 * Usa ratios + gapPx do LayoutRecipe (resolvido por asset-resolver).
 * Caption + body vem do RenderedOption.visualModel.
 */

import type { OptionVisualModel } from '@repo/proposal-engine'

interface ProposalVisualCompositionProps {
  visualModel: OptionVisualModel
}

export function ProposalVisualComposition({
  visualModel,
}: ProposalVisualCompositionProps) {
  const gridTemplateColumns = visualModel.layoutRecipe.ratios
    .map((ratio) => `${ratio}fr`)
    .join(' ')

  return (
    <section className="visual-composition">
      <div
        className="visual-composition__grid"
        style={{
          gridTemplateColumns,
          gap: `${visualModel.layoutRecipe.gapPx}px`,
        }}
      >
        {visualModel.visualItems.map((item) => (
          <article
            className={`visual-composition__item visual-composition__item--${item.assetRole}`}
            key={item.id}
          >
            <p className="visual-composition__label">{item.displayLabel}</p>
            <div className="visual-composition__media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.imageSrc} alt={item.displayLabel ?? ''} />
            </div>
          </article>
        ))}
      </div>

      <div className="visual-composition__caption-panel">
        <p className="visual-composition__caption">
          <strong>{visualModel.captionTitle}</strong>
          <br />
          {visualModel.captionBody}
        </p>
      </div>
    </section>
  )
}
