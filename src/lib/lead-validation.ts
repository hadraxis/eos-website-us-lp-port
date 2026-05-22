// Client-side lead-quality validation.
// Phone: libphonenumber-js (US default, accepts E.164/national).
// Email: disposable-email-domains blocklist + mailcheck typo suggest.
// All checks are advisory — the form still submits on hard fail with a
// suspected_bot tag so PostHog can filter, matching the honeypot pattern.

import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';
import Mailcheck from 'mailcheck';
import disposableDomains from 'disposable-email-domains';

const disposableSet = new Set(disposableDomains);

export type PhoneCheck = {
  valid: boolean;
  e164?: string;
  formatted?: string;
  type?: string;
  reason?: 'too_short' | 'invalid' | 'unparseable';
};

export function checkPhone(input: string, country: CountryCode = 'US'): PhoneCheck {
  const raw = input.trim();
  if (raw.length < 7) return { valid: false, reason: 'too_short' };
  try {
    const num = parsePhoneNumberFromString(raw, country);
    if (!num) return { valid: false, reason: 'unparseable' };
    if (!num.isValid()) return { valid: false, reason: 'invalid' };
    return {
      valid: true,
      e164: num.number,
      formatted: num.formatInternational(),
      type: num.getType?.(),
    };
  } catch {
    return { valid: false, reason: 'unparseable' };
  }
}

export type EmailCheck = {
  valid: boolean;
  disposable: boolean;
  suggestion?: { full: string; domain: string };
  reason?: 'bad_format' | 'disposable' | 'no_domain';
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function checkEmail(input: string): EmailCheck {
  const raw = input.trim().toLowerCase();
  if (!EMAIL_RE.test(raw)) {
    return { valid: false, disposable: false, reason: 'bad_format' };
  }
  const domain = raw.split('@')[1];
  if (!domain) return { valid: false, disposable: false, reason: 'no_domain' };
  if (disposableSet.has(domain)) {
    return { valid: false, disposable: true, reason: 'disposable' };
  }
  const suggested = Mailcheck.run({ email: raw });
  return {
    valid: true,
    disposable: false,
    ...(suggested ? { suggestion: { full: suggested.full, domain: suggested.domain } } : {}),
  };
}
