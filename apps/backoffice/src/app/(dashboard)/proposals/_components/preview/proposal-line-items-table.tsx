/**
 * ProposalLineItemsTable — tabela de itens da solucao.
 *
 * Usa proposal-engine getVisibleLineItems pra aplicar condicoes
 * (hidden, selected, included, enabled, present) de cada linha.
 */

import {
  getVisibleLineItems,
  type ProposalLineItem,
  type ProposalSystem,
} from '@repo/proposal-engine'

interface ProposalLineItemsTableProps {
  lineItems: ProposalLineItem[]
  system: ProposalSystem
}

export function ProposalLineItemsTable({
  lineItems,
  system,
}: ProposalLineItemsTableProps) {
  const visibleLineItems = getVisibleLineItems(lineItems, system)

  if (visibleLineItems.length === 0) {
    return null
  }

  return (
    <table className="line-items-table">
      <tbody>
        {visibleLineItems.map((item, index) => (
          <tr
            className={
              item.condition === 'discount'
                ? 'line-items-table__row line-items-table__row--discount'
                : 'line-items-table__row'
            }
            key={`${item.label}-${index}`}
          >
            <td>{item.quantity}</td>
            <td>{item.label}</td>
            <td>{item.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
