// @ts-nocheck
/**
 * Quote Builder — Operator UI.
 *
 * Porte do BackofficePage.jsx do standalone, adaptado pra Next.js client component.
 * Mesma logica de form, mesmos handlers, mesma matematica.
 *
 * Diferencas vs standalone:
 *  - 'use client' (Next App Router)
 *  - Handlers stubados (sem persistencia DB neste demo; integrar via tRPC quando portar)
 *  - Preview ao vivo inline embaixo do form
 *  - Sem reload Postgres / share-link API (logs + mocks pra mostrar fluxo)
 */

'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  addDays,
  applyPresetToDraft,
  buildAssetLookup,
  buildCurrentProposalOption,
  buildProposalNumber,
  buildProposalRenderModelFromLookup,
  buildProposalStateFromBuilderDraft,
  calculateUsageMetrics,
  createBuilderDraftFromProposal,
  fallbackPricingCatalog,
  getConservativeEvCapacityKwh,
  getCoverAssetOptions,
  syncHomeUsageFromInput,
} from '@repo/proposal-engine'

import { ProposalDocument } from '../_components/preview/proposal-document'
import '../_components/preview/proposal-print.css'
import './builder.css'
import { useDraftPersistence } from '../../../../hooks/use-draft-persistence'

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? 'builder-field builder-field--wide' : 'builder-field'}>
      <span>{label}</span>
      {children}
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="builder-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

interface BuilderProps {
  initialProposalState: any
  pricingCatalog: any
  assetLookupSource: any
}

export function ProposalBuilder({ initialProposalState, pricingCatalog, assetLookupSource }: BuilderProps) {
  const catalog = pricingCatalog || fallbackPricingCatalog
  const coverOptions = useMemo(() => getCoverAssetOptions(assetLookupSource), [assetLookupSource])
  const lookup = useMemo(() => buildAssetLookup(assetLookupSource), [assetLookupSource])
  // FIX(uplift): problem 5 — proposalState mantido imutavel (sample original).
  // So o draft muta. Save persiste draft (localStorage); Reset volta pro draft inicial.
  const [proposalState] = useState(initialProposalState)
  const initialDraft = useMemo(
    () => createBuilderDraftFromProposal(initialProposalState),
    [initialProposalState]
  )
  // FIX(uplift): problem 1 — draft sobrevive a refresh + sync cross-tab via localStorage
  const { draft, setDraft, resetDraft: resetPersisted } = useDraftPersistence<any>(initialDraft)
  const [status, setStatus] = useState('Pronto. Edite e clique Apply pra atualizar o preview.')

  // FIX(uplift): problem 2/3 — appliedState e sempre derivado do draft atual sobre o
  // sample imutavel. /proposals/sample le o mesmo draft do localStorage → shared state.
  const appliedState = useMemo(
    () => buildProposalStateFromBuilderDraft(
      { ...proposalState, proposalOptions: [] },
      { ...draft, proposalOptions: [] },
      catalog
    ),
    [proposalState, draft, catalog]
  )
  const appliedOption = appliedState.proposalOptions[0]
  const savedOptions = Array.isArray(draft.proposalOptions) ? draft.proposalOptions : []
  const usageMetrics = calculateUsageMetrics(draft, catalog)
  const presetOptions = catalog.planPresets || catalog.bundleTemplates || [{ id: 'custom', label: 'Custom' }]

  const renderModel = useMemo(
    () => buildProposalRenderModelFromLookup(lookup, appliedState),
    [lookup, appliedState]
  )

  function patchDraft(patch: any) {
    setDraft((current: any) => ({ ...current, ...patch }))
  }

  function patchUsage(sourceField: string, value: any) {
    setDraft((current: any) => syncHomeUsageFromInput(current, sourceField, value))
  }

  function patchProposalDate(proposalDateIso: string) {
    setDraft((current: any) => {
      const validityDays = current.validityDays === 'custom' ? 'custom' : Number(current.validityDays || 14)
      return {
        ...current,
        proposalDateIso,
        proposalNumber: buildProposalNumber(proposalDateIso, current.quickbooksCustomerId),
        validThroughIso:
          validityDays === 'custom' ? current.validThroughIso : addDays(proposalDateIso, validityDays),
      }
    })
  }

  function patchQuickBooksCustomerId(quickbooksCustomerId: string) {
    setDraft((current: any) => ({
      ...current,
      quickbooksCustomerId,
      proposalNumber: buildProposalNumber(current.proposalDateIso, quickbooksCustomerId),
    }))
  }

  function patchValidityDays(validityDays: any) {
    setDraft((current: any) => ({
      ...current,
      validityDays,
      validThroughIso:
        validityDays === 'custom'
          ? current.validThroughIso
          : addDays(current.proposalDateIso, Number(validityDays || 14)),
    }))
  }

  function handlePresetChange(presetId: string) {
    setDraft((current: any) => applyPresetToDraft(current, catalog, presetId))
  }

  function handleV2xToggle(includesV2x: boolean) {
    setDraft((current: any) => {
      const preset = presetOptions.find((o: any) => o.id === current.presetId)
      const defaultV2xCount = Math.max(0, Number(preset?.defaultV2xCount || 0))
      return {
        ...current,
        includesV2x,
        v2xModuleCount: includesV2x
          ? Math.max(Number(current.v2xModuleCount || 0), defaultV2xCount || 1)
          : 0,
      }
    })
  }

  function applyCurrentDraft() {
    // FIX(uplift): problem 5 — Apply nao toca proposalState. appliedState ja
    // recomputa a cada mudanca no draft via useMemo.
    setStatus(`Applied: ${appliedState.proposalOptions?.[0]?.system?.title ?? 'option'}`)
  }

  function saveCurrentDraft() {
    // FIX(uplift): problem 1 — persistencia vem via useDraftPersistence (localStorage).
    // Aqui so confirma pro usuario. Em prod, dispara trpc.backofficeProposals.update.
    setStatus('Draft salvo no localStorage. Em prod, dispara trpc.backofficeProposals.update.')
    // eslint-disable-next-line no-console
    console.log('[save-draft] draft =', draft)
  }

  function resetDraft() {
    // FIX(uplift): problem 5 — Reset volta ao draft inicial derivado do sample
    // imutavel. proposalState nao precisa resetar (nunca foi mutado).
    resetPersisted()
    setStatus('Reset to initial sample.')
  }

  function addCustomLineItem() {
    setDraft((current: any) => ({
      ...current,
      customLineItems: [
        ...(current.customLineItems || []),
        {
          id: `custom-item-${Date.now()}`,
          enabled: true,
          quantity: '1 un',
          label: 'Custom item',
          description: '',
          amount: 0,
        },
      ],
    }))
  }

  function updateCustomLineItem(id: string, patch: any) {
    setDraft((current: any) => ({
      ...current,
      customLineItems: (current.customLineItems || []).map((item: any) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }))
  }

  function removeCustomLineItem(id: string) {
    setDraft((current: any) => ({
      ...current,
      customLineItems: (current.customLineItems || []).filter((item: any) => item.id !== id),
    }))
  }

  function addProposalOption() {
    const option = buildCurrentProposalOption(proposalState, draft, catalog)
    if (!option) return
    setDraft((current: any) => ({
      ...current,
      proposalOptions: [...(current.proposalOptions || []), option],
    }))
  }

  function removeProposalOption(optionId: string) {
    setDraft((current: any) => ({
      ...current,
      proposalOptions: (current.proposalOptions || []).filter((o: any) => o.id !== optionId),
    }))
  }

  return (
    <>
      <main className="builder-shell">
        <header className="builder-hero">
          <div>
            <p className="builder-hero__eyebrow">Backoffice Control Page</p>
            <h1>Quote Builder</h1>
            <p>
              Build one quote, append saved options, apply catalog extras, describe discounts,
              pick cover art. Live preview embaixo atualiza ao apertar Apply.
            </p>
          </div>
          <div className="builder-hero__actions">
            <a href="/proposals/sample" className="app-button app-button--ghost">
              Sample Preview
            </a>
            <button type="button" className="app-button app-button--danger" onClick={resetDraft}>
              Reset Draft
            </button>
            <button type="button" className="app-button app-button--ghost" onClick={applyCurrentDraft}>
              Apply
            </button>
            <button type="button" className="app-button" onClick={saveCurrentDraft}>
              Save Draft
            </button>
          </div>
        </header>

        <section className="builder-status">
          <p>{status}</p>
          <p>
            Output: <strong>{appliedOption?.system?.title}</strong> at{' '}
            <strong>{appliedOption?.pricing?.grandTotalFormatted}</strong>.
          </p>
        </section>

        <div className="builder-grid">
          <section className="builder-card">
            <h2>Customer</h2>
            <div className="builder-form-grid">
              <Field label="Client name">
                <input value={draft.clientName || ''} onChange={(e) => patchDraft({ clientName: e.target.value })} />
              </Field>
              <Field label="QuickBooks customer ID">
                <input value={draft.quickbooksCustomerId || ''} onChange={(e) => patchQuickBooksCustomerId(e.target.value)} />
              </Field>
              <Field label="Proposal number">
                <input value={draft.proposalNumber || ''} readOnly />
              </Field>
              <Field label="Proposal date">
                <input type="date" value={draft.proposalDateIso || ''} onChange={(e) => patchProposalDate(e.target.value)} />
              </Field>
              <Field label="Valid through">
                <input
                  type="date"
                  value={draft.validThroughIso || ''}
                  onChange={(e) =>
                    setDraft((c: any) => ({ ...c, validThroughIso: e.target.value, validityDays: 'custom' }))
                  }
                />
              </Field>
              <Field label="Validity preset">
                <select
                  value={draft.validityDays ?? 14}
                  onChange={(e) =>
                    patchValidityDays(e.target.value === 'custom' ? 'custom' : Number(e.target.value))
                  }
                >
                  <option value="5">Net 5</option>
                  <option value="14">Net 14</option>
                  <option value="15">Net 15</option>
                  <option value="30">Net 30</option>
                  <option value="custom">Custom</option>
                </select>
              </Field>
              <Field label="Document title" wide>
                <input value={draft.documentTitle || ''} onChange={(e) => patchDraft({ documentTitle: e.target.value })} />
              </Field>
              <Field label="Installation address" wide>
                <textarea rows={3} value={draft.addressText || ''} onChange={(e) => patchDraft({ addressText: e.target.value })} />
              </Field>
            </div>
          </section>

          <section className="builder-card">
            <h2>Plan and System</h2>
            <div className="builder-form-grid">
              <Field label="Plan preset">
                <select value={draft.presetId} onChange={(e) => handlePresetChange(e.target.value)}>
                  {presetOptions.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Cover image (EV)">
                <select
                  value={draft.coverEvId || 'default-ev'}
                  onChange={(e) => {
                    const nextEvId = e.target.value
                    const presetKwh = getConservativeEvCapacityKwh(nextEvId)
                    patchDraft(
                      presetKwh != null
                        ? { coverEvId: nextEvId, evBatteryCapacityKwh: presetKwh }
                        : { coverEvId: nextEvId }
                    )
                  }}
                >
                  {coverOptions.length === 0 ? <option value="default-ev">Default EV Cover</option> : null}
                  {coverOptions.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Battery modules">
                <input type="number" min={1} value={draft.batteryModules} onChange={(e) => patchDraft({ batteryModules: e.target.value })} />
              </Field>
              <Field label="Controllers">
                <input type="number" min={1} value={draft.controllerCount} onChange={(e) => patchDraft({ controllerCount: e.target.value })} />
              </Field>
              <Field label="V2X modules">
                <input
                  type="number"
                  min={draft.includesV2x ? 1 : 0}
                  max={draft.controllerCount || 1}
                  disabled={!draft.includesV2x}
                  value={draft.includesV2x ? (draft.v2xModuleCount || 1) : 0}
                  onChange={(e) => patchDraft({ v2xModuleCount: e.target.value })}
                />
              </Field>
            </div>
            <div className="builder-toggle-grid">
              <Toggle label="Smart Panel" checked={!!draft.includeSmartPanel} onChange={(v) => patchDraft({ includeSmartPanel: v })} />
              <Toggle label="Include V2X" checked={!!draft.includesV2x} onChange={handleV2xToggle} />
              <Toggle label="Installation Kit" checked={!!draft.includeInstallationKit} onChange={(v) => patchDraft({ includeInstallationKit: v })} />
              <Toggle label="Sensor Kit" checked={!!draft.includeSensorKit} onChange={(v) => patchDraft({ includeSensorKit: v })} />
            </div>
          </section>

          <section className="builder-card">
            <h2>V2X Usage Calculator</h2>
            <p className="builder-muted">Edite um campo de usage e os outros dois cascateiam (30 dias / 24 horas).</p>
            <div className="builder-form-grid">
              <Field label="Usage per month (kWh)">
                <input type="number" min={0} step={0.01} value={draft.homeUsageKwhMonthly || 0}
                  onChange={(e) => patchUsage('homeUsageKwhMonthly', e.target.value)} />
              </Field>
              <Field label="Usage per day (kWh)">
                <input type="number" min={0} step={0.01} value={draft.homeUsageKwhDaily || 0}
                  onChange={(e) => patchUsage('homeUsageKwhDaily', e.target.value)} />
              </Field>
              <Field label="Usage per hour (kWh)">
                <input type="number" min={0} step={0.001} value={draft.homeUsageKwhHourly || 0}
                  onChange={(e) => patchUsage('homeUsageKwhHourly', e.target.value)} />
              </Field>
              <Field label="EV battery capacity (kWh)">
                <input type="number" min={0} step={0.1} value={draft.evBatteryCapacityKwh || 0}
                  onChange={(e) => patchDraft({ evBatteryCapacityKwh: e.target.value })} />
              </Field>
            </div>
            <dl className="builder-v2x-summary">
              <div><dt>Stack usable</dt><dd>{usageMetrics.stackUsableKwh} kWh</dd></div>
              <div><dt>EV usable</dt><dd>{usageMetrics.evUsableKwh} kWh</dd></div>
              <div><dt>Combined</dt><dd>{draft.includesV2x ? usageMetrics.combinedUsableKwh : usageMetrics.stackUsableKwh} kWh</dd></div>
              <div>
                <dt>Up to</dt>
                <dd>
                  {draft.includesV2x
                    ? usageMetrics.totalBackupHours > 0 ? `${Math.round(usageMetrics.totalBackupHours)} h` : 'Set usage'
                    : usageMetrics.stackBackupHours > 0 ? `${Math.round(usageMetrics.stackBackupHours)} h` : 'Set usage'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="builder-card">
            <h2>Pricing Controls</h2>
            <div className="builder-form-grid">
              <Field label="Installation charge">
                <input type="number" min={0} step={0.01} value={draft.installationCharge}
                  onChange={(e) => patchDraft({ installationCharge: e.target.value })} />
              </Field>
              <Field label="Shipping charge">
                <input type="number" min={0} step={0.01} value={draft.shippingCharge}
                  onChange={(e) => patchDraft({ shippingCharge: e.target.value })} />
              </Field>
              <Field label="Permit charge">
                <input type="number" min={0} step={0.01} value={draft.permitCharge}
                  onChange={(e) => patchDraft({ permitCharge: e.target.value })} />
              </Field>
              <Field label="Manual adder">
                <input type="number" min={0} step={0.01} value={draft.manualAdder || 0}
                  onChange={(e) => patchDraft({ manualAdder: e.target.value })} />
              </Field>
              <Field label="Tax rate %">
                <input type="number" min={0} step={0.01} value={draft.taxRatePercent}
                  onChange={(e) => patchDraft({ taxRatePercent: e.target.value })} />
              </Field>
              <Field label="Cash installment months">
                <input type="number" min={0} step={1} value={draft.cashTermMonths || 0}
                  onChange={(e) => patchDraft({ cashTermMonths: e.target.value })} />
              </Field>
              <Field label="APR %">
                <input type="number" min={0} step={0.01} value={draft.selectedAprPercent || 0}
                  onChange={(e) => patchDraft({ selectedAprPercent: e.target.value })} />
              </Field>
              <Field label="Terms to show">
                <input value={draft.paymentTermsText || '60, 120, 240'}
                  onChange={(e) => patchDraft({ paymentTermsText: e.target.value })} />
              </Field>
            </div>
            <div className="builder-toggle-grid">
              <Toggle label="Finance includes tax" checked={!!draft.financeIncludesTax}
                onChange={(v) => patchDraft({ financeIncludesTax: v })} />
            </div>
          </section>

          <section className="builder-card">
            <h2>Live Summary</h2>
            <dl className="builder-summary-list">
              <div><dt>Capacity</dt><dd>{(appliedOption?.system?.stacks || []).reduce((s: number, st: any) => s + (st.batteryCount || 0), 0) * 9} kWh</dd></div>
              <div><dt>Stacks</dt><dd>{appliedOption?.system?.stacks?.length || 0}</dd></div>
              <div><dt>Subtotal</dt><dd>{appliedOption?.pricing?.subtotalFormatted}</dd></div>
              <div><dt>Tax</dt><dd>{appliedOption?.pricing?.taxAmountFormatted}</dd></div>
              <div><dt>Cash total</dt><dd>{appliedOption?.pricing?.grandTotalFormatted}</dd></div>
            </dl>
            <Field label="Internal notes" wide>
              <textarea rows={4} value={draft.notes || ''} onChange={(e) => patchDraft({ notes: e.target.value })} />
            </Field>
          </section>

          <section className="builder-card">
            <div className="builder-card__header">
              <div>
                <h2>Quote Extras</h2>
                <p>Discount lives here. Use manual items for one-off rows.</p>
              </div>
              <button type="button" className="app-button app-button--ghost" onClick={addCustomLineItem}>
                Add manual item
              </button>
            </div>

            <div className="builder-stack">
              <div>
                <h3>Discount</h3>
                <article className="builder-manual-item">
                  <div className="builder-form-grid">
                    <Field label="Label">
                      <input value={draft.discountLabel || 'Discount'}
                        onChange={(e) => patchDraft({ discountLabel: e.target.value })} />
                    </Field>
                    <Field label="Amount">
                      <input type="number" min={0} step={0.01} value={draft.discountValue || 0}
                        onChange={(e) => patchDraft({ discountValue: e.target.value })} />
                    </Field>
                    <Field label="Mode">
                      <select value={draft.discountMode || 'percent'}
                        onChange={(e) => patchDraft({ discountMode: e.target.value })}>
                        <option value="fixed">Dollar amount</option>
                        <option value="percent">Percent</option>
                      </select>
                    </Field>
                    <Field label="Description" wide>
                      <input placeholder="Ex: referral credit" value={draft.discountDescription || ''}
                        onChange={(e) => patchDraft({ discountDescription: e.target.value })} />
                    </Field>
                  </div>
                </article>
              </div>

              <div>
                <h3>Manual proposal items</h3>
                <div className="builder-stack">
                  {(draft.customLineItems || []).map((item: any) => (
                    <article className="builder-manual-item" key={item.id}>
                      <div className="builder-manual-item__top">
                        <Toggle label="Include" checked={item.enabled !== false}
                          onChange={(enabled) => updateCustomLineItem(item.id, { enabled })} />
                        <button type="button" className="builder-link-button"
                          onClick={() => removeCustomLineItem(item.id)}>Remove</button>
                      </div>
                      <div className="builder-form-grid">
                        <Field label="Qty">
                          <input value={item.quantity}
                            onChange={(e) => updateCustomLineItem(item.id, { quantity: e.target.value })} />
                        </Field>
                        <Field label="Label">
                          <input value={item.label}
                            onChange={(e) => updateCustomLineItem(item.id, { label: e.target.value })} />
                        </Field>
                        <Field label="Amount">
                          <input type="number" min={0} step={0.01} value={item.amount || 0}
                            onChange={(e) => updateCustomLineItem(item.id, { amount: e.target.value })} />
                        </Field>
                        <Field label="Description" wide>
                          <input value={item.description}
                            onChange={(e) => updateCustomLineItem(item.id, { description: e.target.value })} />
                        </Field>
                      </div>
                    </article>
                  ))}
                  {(draft.customLineItems || []).length === 0 ? (
                    <p className="builder-muted">No manual items yet.</p>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="builder-card">
          <div className="builder-card__header">
            <div>
              <h2>Proposal Options</h2>
              <p>Adicione a quote atual como mais uma solution page. Quando ha options, o preview renderiza todas.</p>
            </div>
            <div className="builder-hero__actions">
              <button type="button" className="app-button app-button--ghost"
                onClick={() => patchDraft({ proposalOptions: [] })}>Clear options</button>
              <button type="button" className="app-button" onClick={addProposalOption}>
                Add current option to proposal
              </button>
            </div>
          </div>
          <div className="builder-option-list">
            {savedOptions.length === 0 ? (
              <p className="builder-muted">No saved proposal options yet.</p>
            ) : (
              savedOptions.map((option: any, index: number) => (
                <article className="builder-option-card" key={option.id}>
                  <div>
                    <strong>Option {index + 1}: {option.optionLabel || option.planLabel || 'Custom'}</strong>
                    <p>
                      {option.system?.title} —{' '}
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
                        .format(Number(option.pricing?.grandTotal || 0))}
                    </p>
                  </div>
                  <button type="button" className="builder-link-button"
                    onClick={() => removeProposalOption(option.id)}>Remove</button>
                </article>
              ))
            )}
          </div>
        </section>
      </main>

      <section className="builder-preview-pane builder-shell">
        <h2>Live Preview (apos Apply / Save Draft)</h2>
        <ProposalDocument renderModel={renderModel} />
      </section>
    </>
  )
}
