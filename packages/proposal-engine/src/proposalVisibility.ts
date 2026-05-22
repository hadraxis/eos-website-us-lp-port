// @ts-nocheck
/* Portado verbatim do standalone (src/lib/proposalVisibility.js). TypeScript strict checks suprimidos pra acelerar o uplift; converter incrementalmente quando ajustar a engine. */
export function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function hasPositiveAmount(value) {
  return toFiniteNumber(value, 0) > 0;
}

export function isExplicitlyOff(value) {
  if (value === false || value === 0) {
    return true;
  }

  const normalized = String(value ?? '').trim().toLowerCase();
  return ['0', 'false', 'no', 'none', 'not included', 'excluded', 'off'].includes(normalized);
}

export function isToggleSelected(value) {
  if (!value || typeof value !== 'object') {
    return true;
  }

  return !(
    value.hidden === true ||
    value.selected === false ||
    value.included === false ||
    value.enabled === false ||
    value.present === false
  );
}

export function matchesCondition(condition, system = {}) {
  if (!condition) {
    return true;
  }

  switch (condition) {
    case 'includesV2x':
    case 'withV2x':
      return Boolean(system.includesV2x);
    case 'excludesV2x':
    case 'withoutV2x':
      return !system.includesV2x;
    case 'includeSmartPanel':
      return system.includeSmartPanel !== false;
    case 'includeInstallationKit':
      return system.includeInstallationKit !== false;
    case 'includeSensorKit':
      return system.includeSensorKit !== false;
    default:
      return true;
  }
}

function getItemKey(item) {
  return String(item?.id || item?.itemKey || item?.label || '').trim().toLowerCase();
}

function isOptionalFeatureLineItem(item, system) {
  const key = getItemKey(item);

  if ((key.includes('smart-panel') || key.includes('smart panel')) && system.includeSmartPanel === false) {
    return false;
  }

  if ((key.includes('installation-kit') || key.includes('installation kit')) && system.includeInstallationKit === false) {
    return false;
  }

  if (
    (key.includes('sensor-kit') || key.includes('power sensor') || key.includes('sensor kit')) &&
    system.includeSensorKit === false
  ) {
    return false;
  }

  if (key.includes('v2x') && !system.includesV2x) {
    return false;
  }

  return true;
}

export function shouldShowLineItem(item, system = {}) {
  if (!item || !isToggleSelected(item) || !matchesCondition(item.condition, system)) {
    return false;
  }

  if (!isOptionalFeatureLineItem(item, system)) {
    return false;
  }

  return !isExplicitlyOff(item.quantity);
}

export function getVisibleLineItems(lineItems, system = {}) {
  return (Array.isArray(lineItems) ? lineItems : []).filter((item) => shouldShowLineItem(item, system));
}

export function hasSelectedLineItem(lineItems, system, matcher) {
  return getVisibleLineItems(lineItems, system).some((item) => matcher(getItemKey(item), item));
}

export function shouldShowSmartPanelVisual(system = {}) {
  if (system.includeSmartPanel === false) {
    return false;
  }

  if (!Array.isArray(system.lineItems)) {
    return true;
  }

  return hasSelectedLineItem(
    system.lineItems,
    system,
    (key) => key.includes('smart-panel') || key.includes('smart panel')
  );
}

export function getVisiblePaymentPlans(pricing = {}) {
  const plans = Array.isArray(pricing.paymentPlans) ? pricing.paymentPlans : [];
  return plans.filter((plan) => isToggleSelected(plan) && (plan.term || plan.payment));
}
