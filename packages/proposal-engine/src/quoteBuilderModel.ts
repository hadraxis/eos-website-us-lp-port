// @ts-nocheck
/* Portado verbatim do standalone (src/lib/quoteBuilderModel.js). TypeScript strict checks suprimidos pra acelerar o uplift; converter incrementalmente quando ajustar a engine. */
import pricingCatalogFallback from '../data/page-3-pricing-config.sample.json';
import { buildInitialProposalState, splitBatteryCountIntoStacks } from './proposalStateModel';
import { DEFAULT_BROCHURE_URL } from './proposalShareLinks';

export const fallbackPricingCatalog = pricingCatalogFallback;
const DAYS_PER_MONTH = 30;
const HOURS_PER_DAY = 24;
const HOURS_PER_MONTH = DAYS_PER_MONTH * HOURS_PER_DAY;
const DEFAULT_VALIDITY_DAYS = 14;
const USABLE_CAPACITY_FACTOR = 0.98;
const DEFAULT_INSTALLATION_CHARGE = 2000;
const DEFAULT_SHIPPING_CHARGE = 150;

const CORE_ITEM_IDS = new Set([
  'battery',
  'controller',
  'smart-panel',
  'installation-kit',
  'sensor-kit',
  'v2x',
]);

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, toNumber(value, min)));
}

function parseQuantity(value) {
  const match = String(value ?? '').match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function parsePercentFromTaxLabel(label) {
  const match = String(label || '').match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? Number(match[1]) : 0;
}

function formatCurrency(value, fractionDigits = 2) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(toNumber(value));
}

function formatCurrencyExact(value) {
  return formatCurrency(value, 2);
}

function buildDiscountLineDescription(discountDescription, discountMode, discountValue) {
  if (discountDescription) {
    return discountDescription;
  }

  if (discountMode === 'percent' && discountValue > 0) {
    return `${roundUsage(discountValue)}% pricing credit applied to eligible quoted equipment.`;
  }

  return 'Applied pricing credit to the quoted system package.';
}

function normalizePlanLabel(value) {
  return String(value || '')
    .replace(/^\s*\d+(?:\.\d+)?\s*kwh\s*/i, '')
    .replace(/\s*backup solution\s*/gi, ' ')
    .replace(/\s*\+\s*v2x\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolvePlanLabel(draft, preset) {
  const presetLabel = normalizePlanLabel(preset?.label);
  const draftLabel = normalizePlanLabel(draft?.planLabel);
  return presetLabel || draftLabel || 'Custom';
}

function buildSystemTitle(capacityKwh, planLabel) {
  const normalizedPlanLabel = normalizePlanLabel(planLabel);
  return normalizedPlanLabel
    ? `${capacityKwh} kWh Backup Solution - ${normalizedPlanLabel} Plan`
    : `${capacityKwh} kWh Backup Solution`;
}

function roundUsage(value) {
  return Number(toNumber(value, 0).toFixed(3));
}

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(isoDate, days) {
  const [year, month, day] = String(isoDate || getTodayIso())
    .split('-')
    .map((value) => Number(value));
  const date = new Date(year, Math.max(0, (month || 1) - 1), day || 1);
  date.setDate(date.getDate() + toNumber(days, DEFAULT_VALIDITY_DAYS));
  return date.toISOString().slice(0, 10);
}

function parseDisplayDateToIso(value) {
  if (!value) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return String(value);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toISOString().slice(0, 10);
}

function formatLongDate(isoDate) {
  if (!isoDate) {
    return '';
  }

  const [year, month, day] = String(isoDate).split('-').map((value) => Number(value));
  const date = new Date(year, Math.max(0, (month || 1) - 1), day || 1);
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function buildProposalNumber(proposalDateIso, quickbooksCustomerId) {
  const [year = '', month = ''] = String(proposalDateIso || getTodayIso()).split('-');
  const digits = String(quickbooksCustomerId || '').replace(/\D/g, '');
  const suffix = (digits.slice(-4) || '0000').padStart(4, '0');
  return `${String(year).slice(-2)}${String(month).padStart(2, '0')}${suffix}`;
}

function parsePaymentTerms(value) {
  const terms = String(value || '60, 120, 240')
    .split(',')
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isFinite(entry) && entry > 0);
  return terms.length > 0 ? terms : [60, 120, 240];
}

function paymentForTerm(principal, monthlyRate, months) {
  if (!monthlyRate) {
    return principal / months;
  }

  return (principal * monthlyRate) / (1 - (1 + monthlyRate) ** -months);
}

function findCatalogItem(catalog, itemId) {
  return (catalog?.catalogItems || []).find((item) => item.id === itemId) || null;
}

function itemSellPrice(catalog, itemId, priceKey = 'cashSell') {
  return toNumber(findCatalogItem(catalog, itemId)?.[priceKey]);
}

function findPreset(catalog, presetId) {
  return (catalog?.planPresets || catalog?.bundleTemplates || []).find((preset) => preset.id === presetId) || null;
}

function perStackModuleLimit(catalog, includesV2x) {
  return includesV2x
    ? toNumber(catalog?.rules?.maxModulesWithV2x, 5)
    : toNumber(catalog?.rules?.maxModules, 6);
}

function totalModuleLimit(catalog, includesV2x, controllerCount) {
  return Math.max(1, perStackModuleLimit(catalog, includesV2x) * Math.max(1, toNumber(controllerCount, 1)));
}

function presetDefaultV2xCount(catalog, presetId) {
  return Math.max(0, toNumber(findPreset(catalog, presetId)?.defaultV2xCount, 0));
}

function resolveV2xModuleCount(draft, catalog) {
  if (!draft?.includesV2x) {
    return 0;
  }

  const defaultCount = presetDefaultV2xCount(catalog, draft?.presetId);
  const maxCount = Math.max(1, toNumber(draft?.controllerCount, 1));
  const fallbackCount = defaultCount || 1;
  return clampNumber(toNumber(draft?.v2xModuleCount, fallbackCount) || fallbackCount, 1, maxCount);
}

function getCatalogExtraItems(catalog) {
  return (catalog?.catalogItems || []).filter(
    (item) => item.enabled !== false && item.id && !CORE_ITEM_IDS.has(item.id)
  );
}

function normalizeCatalogAdjustments(value, catalog) {
  const source = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(
    getCatalogExtraItems(catalog).map((item) => {
      const saved = source[item.id] && typeof source[item.id] === 'object' ? source[item.id] : {};
      return [
        item.id,
        {
          enabled: Boolean(saved.enabled),
          quantity: Math.max(0, toNumber(saved.quantity, 1)),
        },
      ];
    })
  );
}

function normalizeCustomLineItems(items) {
  return (Array.isArray(items) ? items : [])
    .map((item, index) => ({
      id: item?.id || `custom-item-${Date.now()}-${index}`,
      enabled: item?.enabled !== false,
      quantity: String(item?.quantity ?? '1 un'),
      label: String(item?.label || 'Custom item'),
      description: String(item?.description || ''),
      amount: Math.max(0, toNumber(item?.amount ?? item?.cashSell ?? item?.financeSell)),
    }))
    .filter((item) => item.label.trim());
}

function customItemQuantityValue(quantity) {
  const parsed = parseQuantity(quantity);
  return parsed || 1;
}

function getAppliedCatalogLineItems(draft, catalog) {
  const adjustmentMap = normalizeCatalogAdjustments(draft.catalogAdjustments, catalog);
  const catalogById = Object.fromEntries((catalog?.catalogItems || []).map((item) => [item.id, item]));

  return Object.entries(adjustmentMap)
    .map(([id, config]) => ({ item: catalogById[id], config }))
    .filter(({ item, config }) => item && config.enabled && toNumber(config.quantity) > 0)
    .map(({ item, config }) => ({
      id: item.id,
      quantityValue: Math.max(0, toNumber(config.quantity, 1)),
      quantity: `${Math.max(0, toNumber(config.quantity, 1))} ${item.quantityLabel || 'unit'}`,
      label: item.label || item.id,
      description: item.description || item.workbookName || 'Additional item',
      cashSell: itemSellPrice(catalog, item.id, 'cashSell'),
      financeSell: itemSellPrice(catalog, item.id, 'financeSell'),
    }));
}

export function getCoverAssetOptions(assetLookupSource) {
  return (assetLookupSource?.rows || [])
    .filter((row) => row.entityType === 'coverAsset' && row.active !== false)
    .sort((left, right) => toNumber(left.sortOrder) - toNumber(right.sortOrder))
    .map((row) => ({
      id: row.canonicalId,
      label: row.displayLabel || row.canonicalId,
    }));
}

function buildUsageValues(sourceField, rawValue) {
  const value = Math.max(0, toNumber(rawValue, 0));

  if (sourceField === 'homeUsageKwhMonthly') {
    return {
      homeUsageKwhMonthly: roundUsage(value),
      homeUsageKwhDaily: roundUsage(value / DAYS_PER_MONTH),
      homeUsageKwhHourly: roundUsage(value / HOURS_PER_MONTH),
    };
  }

  if (sourceField === 'homeUsageKwhDaily') {
    return {
      homeUsageKwhMonthly: roundUsage(value * DAYS_PER_MONTH),
      homeUsageKwhDaily: roundUsage(value),
      homeUsageKwhHourly: roundUsage(value / HOURS_PER_DAY),
    };
  }

  return {
    homeUsageKwhMonthly: roundUsage(value * HOURS_PER_MONTH),
    homeUsageKwhDaily: roundUsage(value * HOURS_PER_DAY),
    homeUsageKwhHourly: roundUsage(value),
  };
}

export function syncHomeUsageFromInput(draft, sourceField, rawValue) {
  return {
    ...draft,
    ...buildUsageValues(sourceField, rawValue),
  };
}

export function calculateUsageMetrics(draft, catalog = fallbackPricingCatalog) {
  const controllerCount = clampNumber(
    draft?.controllerCount,
    1,
    Math.max(toNumber(catalog?.rules?.maxControllers, 3), 1)
  );
  const batteryModules = clampNumber(
    draft?.batteryModules,
    1,
    totalModuleLimit(catalog, draft?.includesV2x, controllerCount)
  );
  const stackCapacityKwh = batteryModules * 9;
  const stackUsableKwh = stackCapacityKwh * USABLE_CAPACITY_FACTOR;
  const evBatteryCapacityKwh = Math.max(0, toNumber(draft?.evBatteryCapacityKwh, 0));
  const evUsableKwh = evBatteryCapacityKwh * USABLE_CAPACITY_FACTOR;
  const homeUsageKwhMonthly = Math.max(0, toNumber(draft?.homeUsageKwhMonthly, 0));
  const homeUsageKwhDaily = Math.max(0, toNumber(draft?.homeUsageKwhDaily, 0));
  const homeUsageKwhHourly = Math.max(0, toNumber(draft?.homeUsageKwhHourly, 0));
  const combinedCapacityKwh = stackCapacityKwh + evBatteryCapacityKwh;
  const combinedUsableKwh = stackUsableKwh + evUsableKwh;
  const stackBackupHours = homeUsageKwhHourly > 0 ? stackUsableKwh / homeUsageKwhHourly : 0;
  const evBackupHours = homeUsageKwhHourly > 0 ? evUsableKwh / homeUsageKwhHourly : 0;
  const totalBackupHours = homeUsageKwhHourly > 0 ? combinedUsableKwh / homeUsageKwhHourly : 0;

  return {
    homeUsageKwhMonthly: roundUsage(homeUsageKwhMonthly),
    homeUsageKwhDaily: roundUsage(homeUsageKwhDaily),
    homeUsageKwhHourly: roundUsage(homeUsageKwhHourly),
    evBatteryCapacityKwh: roundUsage(evBatteryCapacityKwh),
    stackCapacityKwh: roundUsage(stackCapacityKwh),
    stackUsableKwh: roundUsage(stackUsableKwh),
    evUsableKwh: roundUsage(evUsableKwh),
    combinedCapacityKwh: roundUsage(combinedCapacityKwh),
    combinedUsableKwh: roundUsage(combinedUsableKwh),
    stackBackupHours: roundUsage(stackBackupHours),
    evBackupHours: roundUsage(evBackupHours),
    totalBackupHours: roundUsage(totalBackupHours),
  };
}

function getBatteryCount(state) {
  const stacksTotal = (state.system?.stacks || []).reduce(
    (sum, stack) => sum + toNumber(stack?.batteryCount),
    0
  );
  if (stacksTotal > 0) {
    return stacksTotal;
  }

  const batteryLine = (state.system?.lineItems || []).find((item) => item.label === 'Battery');
  return parseQuantity(batteryLine?.quantity) || 1;
}

function getControllerCount(state) {
  const controllerLine = (state.system?.lineItems || []).find((item) => item.label === 'Smart Controller');
  return parseQuantity(controllerLine?.quantity) || 1;
}

function normalizeSellerName(name) {
  return /eos energy/i.test(name || '') ? 'Eos Solar Inc.' : name || 'Eos Solar Inc.';
}

export function createBuilderDraftFromProposal(state, catalog = fallbackPricingCatalog) {
  const subtotal = toNumber(state.pricing?.subtotal);
  const taxAmount = toNumber(state.pricing?.taxAmount);
  const parsedTaxRate = parsePercentFromTaxLabel(state.pricing?.taxLabel);

  const primaryOption = Array.isArray(state.proposalOptions) && state.proposalOptions.length > 0
    ? state.proposalOptions[0]
    : null;
  const systemSource = primaryOption?.system || state.system || {};
  const pricingSource = primaryOption?.pricing || state.pricing || {};
  const usageFromHourly = Number(systemSource?.v2xAverageUsageWatts || 0) > 0
    ? buildUsageValues('homeUsageKwhHourly', Number(systemSource.v2xAverageUsageWatts) / 1000)
    : buildUsageValues('homeUsageKwhMonthly', systemSource?.homeUsageKwhMonthly || 0);
  const proposalDateIso = parseDisplayDateToIso(state.meta?.dateCreated) || getTodayIso();
  const quickbooksCustomerId = state.client?.quickbooksCustomerId || '';
  const presetId = systemSource?.presetId || primaryOption?.planId || 'custom';
  const includesV2x = Boolean(systemSource?.includesV2x);
  const v2xLineItem = (systemSource?.lineItems || []).find((item) => /v2x module/i.test(item.label || ''));
  const stackV2xCount = Array.isArray(systemSource?.stacks)
    ? systemSource.stacks.filter((stack) => stack?.v2x).length
    : 0;
  const v2xModuleCount = includesV2x
    ? Math.max(
        parseQuantity(v2xLineItem?.quantity),
        toNumber(systemSource?.v2xModuleCount, 0),
        stackV2xCount,
        presetDefaultV2xCount(catalog, presetId),
        1
      )
    : 0;
  const controllerCount = getControllerCount({ system: systemSource });

  return {
    clientName: state.client?.name || '',
    quickbooksCustomerId,
    addressText: (state.client?.addressLines || []).join('\n'),
    documentTitle: state.meta?.documentTitle || 'Your Energy Solution Proposal',
    proposalNumber: state.meta?.proposalNumber || buildProposalNumber(proposalDateIso, quickbooksCustomerId),
    proposalDateIso,
    validThroughIso:
      parseDisplayDateToIso(state.meta?.expirationDate) || addDays(proposalDateIso, DEFAULT_VALIDITY_DAYS),
    validityDays: DEFAULT_VALIDITY_DAYS,
    termsUrl: state.meta?.termsUrl || 'https://www.eos-e.com/legal/Installation-Terms-and-Conditions.pdf',
    brochureUrl: state.meta?.brochureUrl || DEFAULT_BROCHURE_URL,
    sellerName: normalizeSellerName(state.seller?.name),
    sellerPhone: state.seller?.officePhone || state.seller?.phone || '',
    sellerWebsite: state.seller?.website || '',
    sellerSupportEmail: state.seller?.supportEmail || state.seller?.email || '',
    sellerFacebook: state.seller?.facebook || '',
    sellerInstagram: state.seller?.instagram || '',
    sellerLinkedin: state.seller?.linkedin || '',
    presetId,
    planId: primaryOption?.planId || systemSource?.presetId || 'custom',
    planLabel: primaryOption?.planLabel || primaryOption?.optionLabel || 'Custom',
    coverEvId: systemSource?.evId || systemSource?.coverArtKey || 'default-ev',
    planNote: '',
    batteryModules: getBatteryCount({ system: systemSource }),
    controllerCount,
    includesV2x,
    v2xModuleCount,
    includeSmartPanel: systemSource?.includeSmartPanel !== false,
    includeInstallationKit: Boolean(systemSource?.includeInstallationKit),
    includeSensorKit: Boolean(systemSource?.includeSensorKit),
    evBatteryCapacityKwh: Math.max(0, toNumber(systemSource?.v2xVehicleBatteryCapacityKwh, 0)),
    ...usageFromHourly,
    installationCharge: toNumber(pricingSource?.installationCharge, DEFAULT_INSTALLATION_CHARGE),
    shippingCharge: toNumber(pricingSource?.shippingCharge, DEFAULT_SHIPPING_CHARGE),
    permitCharge: toNumber(pricingSource?.permitCharge, 0),
    manualAdder: toNumber(pricingSource?.manualAdder, 0),
    discountLabel: pricingSource?.discountLabel || 'Discount',
    discountValue: toNumber(pricingSource?.discountValue ?? pricingSource?.discountAmount),
    discountMode: pricingSource?.discountMode === 'percent'
      ? 'percent'
      : pricingSource?.discountMode === 'fixed'
        ? 'fixed'
        : toNumber(pricingSource?.discountAmount) > 0
          ? 'fixed'
          : 'percent',
    discountDescription: pricingSource?.discountDescription || '',
    taxRatePercent: parsedTaxRate || (subtotal > 0 ? Number(((taxAmount / subtotal) * 100).toFixed(2)) : 8.25),
    cashTermMonths: pricingSource?.cashInstallmentLabel ? parseQuantity(pricingSource.cashInstallmentLabel) : 0,
    selectedAprPercent: Number(((state.pricing?.selectedApr || fallbackPricingCatalog.finance?.defaultApr || 0) * 100).toFixed(2)),
    financeIncludesTax: false,
    paymentTermsText: (pricingSource?.paymentPlans || [])
      .map((plan) => parseQuantity(plan.term))
      .filter(Boolean)
      .join(', ') || '60, 120, 240',
    catalogAdjustments: {},
    customLineItems: [],
    proposalOptions: Array.isArray(state.proposalOptions) ? state.proposalOptions : [],
    notes: (state.narrative?.siteDetails || []).join('\n'),
  };
}

export function applyPresetToDraft(draft, catalog, presetId) {
  const preset = findPreset(catalog, presetId);
  if (!preset || presetId === 'custom') {
    return {
      ...draft,
      presetId,
      planNote: '',
      includeInstallationKit: false,
      includeSensorKit: false,
      v2xModuleCount: 0,
    };
  }

  return {
    ...draft,
    presetId,
    planId: presetId,
    planLabel: preset.label || draft.planLabel,
    batteryModules: preset.modules || draft.batteryModules,
    controllerCount: preset.controllerCount || draft.controllerCount,
    includeSmartPanel: preset.includeSmartPanel !== false,
    includeInstallationKit: false,
    includeSensorKit: false,
    includesV2x: false,
    planNote: '',
    v2xModuleCount: Math.max(0, toNumber(preset.defaultV2xCount, 0)),
  };
}

export function buildProposalStateFromBuilderDraft(baseState, draft, catalog = fallbackPricingCatalog) {
  const controllerCount = clampNumber(
    draft.controllerCount,
    1,
    Math.max(toNumber(catalog?.rules?.maxControllers, 3), 1)
  );
  const includesV2x = Boolean(draft.includesV2x);
  const batteryModules = clampNumber(
    draft.batteryModules,
    1,
    totalModuleLimit(catalog, includesV2x, controllerCount)
  );
  const v2xModuleCount = resolveV2xModuleCount({ ...draft, controllerCount }, catalog);
  const preset = findPreset(catalog, draft.presetId);
  const presetLabel = resolvePlanLabel(draft, preset);
  const capacityKwh = batteryModules * 9;
  const discountLabel = String(draft.discountLabel || 'Discount').trim() || 'Discount';
  const discountValue = Math.max(0, toNumber(draft.discountValue));
  const discountMode = draft.discountMode === 'percent' ? 'percent' : 'fixed';
  const discountDescription = String(draft.discountDescription || '').trim();
  const installationCharge = Math.max(0, toNumber(draft.installationCharge));
  const shippingCharge = Math.max(0, toNumber(draft.shippingCharge));
  const permitCharge = Math.max(0, toNumber(draft.permitCharge));
  const manualAdder = Math.max(0, toNumber(draft.manualAdder));
  const taxRatePercent = Math.max(0, toNumber(draft.taxRatePercent, 8.25));
  const usageMetrics = calculateUsageMetrics(draft, catalog);
  const catalogLineItems = getAppliedCatalogLineItems(draft, catalog);
  const customLineItems = normalizeCustomLineItems(draft.customLineItems).filter((item) => item.enabled);
  const extraCashSubtotal =
    catalogLineItems.reduce((sum, item) => sum + item.quantityValue * item.cashSell, 0) +
    customLineItems.reduce((sum, item) => sum + customItemQuantityValue(item.quantity) * item.amount, 0);
  const extraFinanceSubtotal =
    catalogLineItems.reduce((sum, item) => sum + item.quantityValue * item.financeSell, 0) +
    customLineItems.reduce((sum, item) => sum + customItemQuantityValue(item.quantity) * item.amount, 0);

  const hardwareSubtotal =
    batteryModules * itemSellPrice(catalog, 'battery') +
    controllerCount * itemSellPrice(catalog, 'controller') +
    (draft.includeSmartPanel ? itemSellPrice(catalog, 'smart-panel') : 0) +
    (draft.includeInstallationKit ? itemSellPrice(catalog, 'installation-kit') : 0) +
    (draft.includeSensorKit ? itemSellPrice(catalog, 'sensor-kit') : 0) +
    v2xModuleCount * itemSellPrice(catalog, 'v2x') +
    extraCashSubtotal;
  const subtotal = hardwareSubtotal + installationCharge + shippingCharge + permitCharge + manualAdder;
  const rawDiscountAmount =
    discountMode === 'percent'
      ? (Math.max(0, hardwareSubtotal + manualAdder) * discountValue) / 100
      : discountValue;
  const discountAmount = Math.min(Math.max(0, rawDiscountAmount), Math.max(0, hardwareSubtotal + manualAdder));
  const taxableAmount = Math.max(0, hardwareSubtotal + manualAdder - discountAmount);
  const taxAmount = Number(((taxableAmount * taxRatePercent) / 100).toFixed(2));
  const grandTotal = Math.round((subtotal - discountAmount + taxAmount) * 100) / 100;
  const financePrincipal =
    batteryModules * itemSellPrice(catalog, 'battery', 'financeSell') +
    controllerCount * itemSellPrice(catalog, 'controller', 'financeSell') +
    (draft.includeSmartPanel ? itemSellPrice(catalog, 'smart-panel', 'financeSell') : 0) +
    (draft.includeInstallationKit ? itemSellPrice(catalog, 'installation-kit', 'financeSell') : 0) +
    (draft.includeSensorKit ? itemSellPrice(catalog, 'sensor-kit', 'financeSell') : 0) +
    v2xModuleCount * itemSellPrice(catalog, 'v2x', 'financeSell') +
    extraFinanceSubtotal +
    installationCharge +
    shippingCharge +
    permitCharge +
    manualAdder -
    discountAmount;

  const selectedApr = Math.max(0, toNumber(draft.selectedAprPercent, 0) / 100);
  const financeIncludesTax = Boolean(draft.financeIncludesTax);
  const financeRates = catalog?.finance?.aprOptions || [];
  const financeAmount = financeIncludesTax ? financePrincipal + taxAmount : financePrincipal;
  const paymentTerms = parsePaymentTerms(draft.paymentTermsText).slice(0, 3);
  const paymentPlans = paymentTerms.map((term, index) => ({
    term: `${term} Months`,
    payment: `${formatCurrency(paymentForTerm(financeAmount, selectedApr || financeRates[index + 1] || financeRates[0] || 0, term), 0)}/mo`,
  }));

  const lineItems = [
    {
      quantity: `${batteryModules} un`,
      label: 'Battery',
      description: '9 kWh Energy Storage Battery Module',
    },
    {
      quantity: `${controllerCount} un`,
      label: 'Smart Controller',
      description: '11.5 kW Energy System Controller',
    },
    draft.includeSmartPanel
      ? {
          quantity: '1 un',
          label: 'Smart Panel',
          description: 'Smart Energy Load Panel',
        }
      : null,
    draft.includeInstallationKit
      ? {
          quantity: '1 un',
          label: 'Installation Kit',
          description: 'For wall-mounted energy system',
        }
      : null,
    draft.includeSensorKit
      ? {
          quantity: '1 un',
          label: 'Power Sensor',
          description: 'Power sensor enclosure kit',
        }
      : null,
    includesV2x
      ? {
          quantity: `${v2xModuleCount} un`,
          label: 'V2X Module',
          description: '25 kW bidirectional EV charging module',
          condition: 'includesV2x',
        }
      : null,
    ...catalogLineItems.map((item) => ({
      quantity: item.quantity,
      label: item.label,
      description: item.description,
    })),
    ...customLineItems.map((item) => ({
      quantity: item.quantity,
      label: item.label,
      description: item.description || 'Additional item',
    })),
    {
      quantity: 'Included',
      label: 'Wiring',
      description: 'Conduit, breakers, fittings, and terminations.',
    },
    {
      quantity: 'Included',
      label: 'Shipping',
      description: 'Freight delivery, packaging, and logistics.',
    },
    {
      quantity: 'Included',
      label: 'Installation',
      description: 'Installation, commissioning, testing, handoff.',
    },
    discountAmount > 0
      ? {
          quantity: 'Included',
          label: discountLabel,
          description: buildDiscountLineDescription(discountDescription, discountMode, discountValue),
          condition: 'discount',
        }
      : null,
  ].filter(Boolean);

  const optionSnapshot = {
    id: `option-${Date.now()}`,
    optionLabel: presetLabel,
    planId: draft.planId || draft.presetId || 'custom',
    planLabel: presetLabel,
    pricingMode: 'cash',
    system: {
      ...baseState.system,
      presetId: draft.presetId,
      evId: draft.coverEvId || baseState.system?.evId || 'default-ev',
      title: buildSystemTitle(capacityKwh, presetLabel),
      summary: '',
      backupHours: includesV2x
        ? Math.max(0, usageMetrics.totalBackupHours || 0)
        : Math.max(0, usageMetrics.stackBackupHours || 0),
      includesV2x,
      v2xModuleCount,
      controllerCount,
      includeSmartPanel: Boolean(draft.includeSmartPanel),
      includeInstallationKit: Boolean(draft.includeInstallationKit),
      includeSensorKit: Boolean(draft.includeSensorKit),
      homeUsageKwhMonthly: usageMetrics.homeUsageKwhMonthly,
      homeUsageKwhDaily: usageMetrics.homeUsageKwhDaily,
      homeUsageKwhHourly: usageMetrics.homeUsageKwhHourly,
      v2xVehicleBatteryCapacityKwh: usageMetrics.evBatteryCapacityKwh,
      v2xVehicleBackupHours: includesV2x ? usageMetrics.totalBackupHours : 0,
      v2xAverageUsageWatts: usageMetrics.homeUsageKwhHourly * 1000,
      v2xVehicleBackupNote:
        (includesV2x ? usageMetrics.totalBackupHours : usageMetrics.stackBackupHours) > 0
        ? `Up to ${Math.round(includesV2x ? usageMetrics.totalBackupHours : usageMetrics.stackBackupHours)} hours using ${roundUsage(
            usageMetrics.homeUsageKwhHourly
          )} kWh/hour.`
        : '',
      // FIX(uplift): patch 3 — propaga catalog.rules pro split honrar limites
      stacks: splitBatteryCountIntoStacks(batteryModules, includesV2x, controllerCount, v2xModuleCount, catalog?.rules),
      lineItems,
    },
    pricing: {
      ...baseState.pricing,
      subtotal,
      installationCharge,
      shippingCharge,
      permitCharge,
      manualAdder,
      discountLabel,
      discountMode,
      discountValue,
      discountAmount,
      discountDescription,
      taxLabel: `Estimated tax (${taxRatePercent}%)`,
      taxAmount,
      totalLabel: 'Grand Total (Cash Payment)',
      grandTotal,
      cashInstallmentLabel: draft.cashTermMonths ? `${Math.max(1, toNumber(draft.cashTermMonths, 6))} Months` : '',
      cashInstallmentPayment: draft.cashTermMonths
        ? `${formatCurrencyExact(((subtotal - discountAmount) + (financeIncludesTax ? taxAmount : 0)) / Math.max(1, toNumber(draft.cashTermMonths, 6)))}/mo`
        : '',
      selectedApr,
      financeIncludesTax,
      paymentPlans,
    },
  };

  const rootState = {
    ...baseState,
    meta: {
      ...baseState.meta,
      documentTitle: draft.documentTitle,
      proposalNumber: draft.proposalNumber,
      dateCreated: formatLongDate(draft.proposalDateIso),
      expirationDate: formatLongDate(draft.validThroughIso),
      termsUrl: draft.termsUrl || 'https://www.eos-e.com/legal/Installation-Terms-and-Conditions.pdf',
      brochureUrl: draft.brochureUrl || DEFAULT_BROCHURE_URL,
    },
    client: {
      ...baseState.client,
      name: draft.clientName,
      quickbooksCustomerId: draft.quickbooksCustomerId || '',
      addressLines: String(draft.addressText || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    },
    seller: {
      ...baseState.seller,
      name: draft.sellerName || 'Eos Solar Inc.',
      phone: draft.sellerPhone || baseState.seller?.phone,
      officePhone: draft.sellerPhone || baseState.seller?.officePhone,
      email: draft.sellerSupportEmail || baseState.seller?.email,
      supportEmail: draft.sellerSupportEmail || baseState.seller?.supportEmail,
      website: draft.sellerWebsite || baseState.seller?.website,
      facebook: draft.sellerFacebook || baseState.seller?.facebook,
      instagram: draft.sellerInstagram || baseState.seller?.instagram,
      linkedin: draft.sellerLinkedin || baseState.seller?.linkedin,
    },
    system: optionSnapshot.system,
    pricing: optionSnapshot.pricing,
    proposalOptions: Array.isArray(draft.proposalOptions) && draft.proposalOptions.length > 0
      ? draft.proposalOptions
      : [],
    narrative: {
      ...baseState.narrative,
      siteDetails: String(draft.notes || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    },
  };
  return buildInitialProposalState(rootState, null);
}

export function buildCurrentProposalOption(baseState, draft, catalog = fallbackPricingCatalog) {
  const state = buildProposalStateFromBuilderDraft(
    { ...baseState, proposalOptions: [] },
    { ...draft, proposalOptions: [] },
    catalog
  );
  const option = state.proposalOptions[0] || state.system
    ? {
        id: `option-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        optionLabel: resolvePlanLabel(draft, findPreset(catalog, draft.presetId)),
        planId: draft.planId || draft.presetId || 'custom',
        planLabel: resolvePlanLabel(draft, findPreset(catalog, draft.presetId)),
        pricingMode: 'cash',
        system: state.system,
        pricing: state.pricing,
      }
    : null;

  return option;
}
