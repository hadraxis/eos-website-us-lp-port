// @ts-nocheck
/* Portado verbatim do standalone (src/lib/proposalStateModel.js). TypeScript strict checks suprimidos pra acelerar o uplift; converter incrementalmente quando ajustar a engine. */
function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function deepMerge(base, override) {
  if (Array.isArray(base) || Array.isArray(override)) {
    return override === undefined ? base : override;
  }

  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override === undefined ? base : override;
  }

  const merged = { ...base };
  Object.entries(override).forEach(([key, value]) => {
    merged[key] = key in base ? deepMerge(base[key], value) : value;
  });
  return merged;
}

export function normalizePresetId(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'home-reserve') {
    return 'pro';
  }
  return raw || 'custom';
}

export function normalizeEvId(value, fallbackCoverKey) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw) {
    return raw;
  }

  if (String(fallbackCoverKey || '').trim().toLowerCase() === 'f150') {
    return 'ford-f150-lightning';
  }

  return null;
}

function parseQuantity(value) {
  const match = String(value ?? '').match(/\d+/);
  return match ? Number(match[0]) : 0;
}

export function splitBatteryCountIntoStacks(
  totalBatteryCount,
  includesV2x,
  controllerCount = null,
  v2xModuleCount = null,
  // FIX(uplift): patch 3 — limites por stack vem do catalog.rules em vez de
  // hardcoded. Aceita rules opcional pra retrocompat: se nao passar, mantem 5/6.
  rules = null
) {
  const total = Math.max(0, Number(totalBatteryCount || 0));
  if (total <= 0) {
    return [];
  }

  // FIX(uplift): patch 3 — pega de rules.maxModulesWithV2x / rules.maxModules
  // quando disponivel, caindo pros valores legados (5/6) por seguranca.
  const maxPerStack = includesV2x
    ? Number(rules?.maxModulesWithV2x ?? 5)
    : Number(rules?.maxModules ?? 6);
  const minimumStackCount = Math.ceil(total / maxPerStack);
  const requestedStackCount = Math.max(0, Number(controllerCount || 0));
  const stackCount = Math.max(minimumStackCount, requestedStackCount || 0, 1);
  const base = Math.floor(total / stackCount);
  const remainder = total % stackCount;
  const activeV2xStackCount = includesV2x
    ? Math.min(stackCount, Math.max(1, Number(v2xModuleCount || stackCount)))
    : 0;

  return Array.from({ length: stackCount }, (_, index) => ({
    batteryCount: base + (index < remainder ? 1 : 0),
    v2x: index < activeV2xStackCount,
    position: ['primary', 'secondary', 'tertiary'][index] || `stack-${index + 1}`,
  }));
}

// FIX(uplift): patch 3 — deriveStacks aceita catalog.rules pra propagar
// limites por stack ao splitBatteryCountIntoStacks. Mantem rules opcional
// pra retrocompat.
export function deriveStacks(system, rules = null) {
  if (Array.isArray(system?.stacks) && system.stacks.length > 0) {
    return system.stacks.map((stack, index) => ({
      batteryCount: Math.max(1, Number(stack?.batteryCount || 0)),
      v2x: Boolean(stack?.v2x),
      position: stack?.position || ['primary', 'secondary', 'tertiary'][index] || `stack-${index + 1}`,
    }));
  }

  const batteryItem = (system?.lineItems || []).find((item) => item.label === 'Battery');
  const totalBatteryCount = parseQuantity(batteryItem?.quantity);
  return splitBatteryCountIntoStacks(
    totalBatteryCount,
    system?.includesV2x,
    system?.controllerCount,
    system?.v2xModuleCount,
    rules
  );
}

function deriveSummaryParts(system) {
  const text = String(system?.summary || '').trim();
  const isInternalInventorySummary =
    /catalog adjustment/i.test(text) ||
    (/\bbatter(y|ies)\b/i.test(text) && /\bcontroller\b/i.test(text) && /\bsmart panel\b/i.test(text));
  const backupHours = Number(system?.v2xVehicleBackupHours || system?.backupHours || 0);

  function buildBackupSummary() {
    if (backupHours > 0) {
      return {
        lead: `Up to ${Math.round(backupHours)} hours of energy backup`,
        tail: system?.includesV2x ? ', depending on usage and connected EV load' : ', depending on usage',
      };
    }

    return {
      lead: system?.includesV2x ? 'Up to 100 hours of energy backup' : 'Up to 24 hours of energy backup',
      tail: system?.includesV2x ? ', depending on usage and connected EV load' : ', depending on usage',
    };
  }

  if (!text || isInternalInventorySummary || (/depending on usage/i.test(text) && !/^up to\b/i.test(text))) {
    return buildBackupSummary();
  }

  if (text.startsWith('Up to ')) {
    const splitMatch = text.match(/^(Up to .*?)(,.*)$/);
    if (splitMatch) {
      return { lead: splitMatch[1], tail: splitMatch[2] };
    }
  }

  return {
    lead: text,
    tail: '',
  };
}

function formatCurrency(value, locale = 'en-US', currency = 'USD') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDiscount(value, locale, currency) {
  const amount = Math.abs(Number(value || 0));
  return `-${formatCurrency(amount, locale, currency)}`;
}

function splitTerm(term) {
  const normalized = String(term).trim().replace(/\.+$/, '');
  const [lead, ...rest] = normalized.split('. ');
  if (rest.length === 0) {
    return { lead: `${lead}.`, tail: '' };
  }

  return {
    lead: `${lead}. `,
    tail: rest.join('. ').replace(/\.+$/, ''),
  };
}

function getTermSortWeight(term) {
  const text = String(term).toLowerCase();
  if (text.includes('complete professional installation')) return 10;
  if (text.includes('commissioning') || text.includes('safety testing') || text.includes('activation')) return 20;
  if (text.includes('electrical codes') || text.includes('standards')) return 30;
  if (text.includes('basic electrical') || text.includes('wiring')) return 40;
  if (text.includes('integration')) return 50;
  if (text.includes('monitoring') || text.includes('mobile app')) return 60;
  if (text.includes('v2x')) return 90;
  if (text.includes('10-year') || text.includes('manufacturer warranty')) return 70;
  if (text.includes('additional materials') || text.includes('additional electrical')) return 80;
  return 100;
}

function buildInstallationTerms(rootState, includesV2x) {
  const terms = [...(rootState.standardInstallationTerms || [])];
  if (includesV2x && rootState.v2xInstallationTerm) {
    terms.push(rootState.v2xInstallationTerm);
  }

  return terms
    .map((term, index) => ({ term, index }))
    .sort((left, right) => getTermSortWeight(left.term) - getTermSortWeight(right.term) || left.index - right.index)
    .map(({ term }) => splitTerm(term));
}

export function normalizeOption(rootState, rawOption, index) {
  const systemSource = rawOption?.system ?? rootState.system ?? {};
  const pricingSource = rawOption?.pricing ?? rootState.pricing ?? {};
  const locale = rootState.meta?.locale ?? 'en-US';
  const currency = rootState.meta?.currency ?? 'USD';
  const stacks = deriveStacks(systemSource);
  const discountAmount = Number(
    rawOption?.pricing?.discountAmount ??
      pricingSource.discountAmount ??
      pricingSource.discount ??
      pricingSource.cashDiscountAmount ??
      0
  );
  const summaryParts = deriveSummaryParts(systemSource);

  return {
    id: rawOption?.id || `option-${index + 1}`,
    optionLabel: rawOption?.optionLabel || rawOption?.planLabel || systemSource.title || `Option ${index + 1}`,
    system: {
      ...systemSource,
      presetId: normalizePresetId(rawOption?.planId || systemSource.presetId),
      evId: normalizeEvId(systemSource.evId, systemSource.coverArtKey),
      stacks,
      summaryLead: summaryParts.lead,
      summaryTail: summaryParts.tail,
    },
    pricing: {
      ...pricingSource,
      discountLabel: pricingSource.discountLabel || 'Discount',
      discountAmount,
      subtotalFormatted: formatCurrency(
        Math.max(0, Number(pricingSource.subtotal ?? 0) - (Number.isFinite(discountAmount) ? discountAmount : 0)),
        locale,
        currency
      ),
      discountFormatted: formatDiscount(discountAmount, locale, currency),
      taxAmountFormatted: formatCurrency(pricingSource.taxAmount, locale, currency),
      grandTotalFormatted: formatCurrency(pricingSource.grandTotal, locale, currency),
      cashInstallmentPayment: pricingSource.cashInstallmentPayment || '',
      cashInstallmentLabel: pricingSource.cashInstallmentLabel || '',
      paymentPlans: Array.isArray(pricingSource.paymentPlans) ? pricingSource.paymentPlans : [],
    },
    terms: buildInstallationTerms(rootState, systemSource.includesV2x),
  };
}

export function buildOptions(state) {
  if (Array.isArray(state.proposalOptions) && state.proposalOptions.length > 0) {
    return state.proposalOptions.map((option, index) => normalizeOption(state, option, index));
  }

  return [normalizeOption(state, { system: state.system, pricing: state.pricing }, 0)];
}

export function buildInitialProposalState(baseState, storedState = null) {
  const mergedState = deepMerge(baseState, storedState ?? {});

  return {
    ...mergedState,
    system: {
      ...mergedState.system,
      presetId: normalizePresetId(mergedState.system?.presetId),
      evId: normalizeEvId(mergedState.system?.evId, mergedState.system?.coverArtKey),
    },
    proposalOptions: buildOptions(mergedState),
  };
}
