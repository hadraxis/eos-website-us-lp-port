// Server-side lead verification proxy.
// Twilio Lookup → line type (voip / landline / mobile) + carrier name.
//   STUBBED — Twilio is paid (~$0.008/lookup). Activate by setting
//   TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN if/when budget allows.
// QuickEmailVerification → email deliverability + disposable + role + typo.
//   LIVE when QUICKEMAILVERIFICATION_API_KEY (or lowercase
//   `quickemailverification` per current global env) is set. Free tier =
//   100 credits, then ~$0.004/lookup if upgraded.
//
// Static export skips route handlers — this only runs on Vercel.

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type Body = { phone?: string; email?: string };

type TwilioResult =
  | { stubbed: true }
  | { valid: boolean; lineType?: string; carrier?: string; countryCode?: string };

type EmailResult =
  | { stubbed: true }
  | {
      valid: boolean;
      result?: string;       // 'valid' | 'invalid' | 'unknown'
      reason?: string;       // 'accepted_email' | 'rejected_email' | 'no_mx_record' | ...
      disposable?: boolean;
      acceptAll?: boolean;
      role?: boolean;
      free?: boolean;
      didYouMean?: string;
      safeToSend?: boolean;
    };

async function lookupPhone(phone: string): Promise<TwilioResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return { stubbed: true };

  // Twilio Lookup v2: GET /v2/PhoneNumbers/{E.164}?Fields=line_type_intelligence
  // https://www.twilio.com/docs/lookup/v2-api/line-type-intelligence
  const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(
    phone,
  )}?Fields=line_type_intelligence`;
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  try {
    const r = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return { valid: false };
    const j = (await r.json()) as {
      valid?: boolean;
      country_code?: string;
      line_type_intelligence?: { type?: string; carrier_name?: string };
    };
    return {
      valid: Boolean(j.valid),
      lineType: j.line_type_intelligence?.type,
      carrier: j.line_type_intelligence?.carrier_name,
      countryCode: j.country_code,
    };
  } catch {
    return { valid: false };
  }
}

async function verifyEmail(email: string): Promise<EmailResult> {
  // Accept both casings — global env has `quickemailverification=...` (lowercase),
  // but Vercel env vars are conventionally UPPER_SNAKE. Prefer canonical.
  const key =
    process.env.QUICKEMAILVERIFICATION_API_KEY ||
    process.env.quickemailverification;
  if (!key) return { stubbed: true };

  // QuickEmailVerification v1: GET /v1/verify?email=&apikey=
  // https://docs.quickemailverification.com/email-verification-api/verify-an-email-address
  const url = `https://api.quickemailverification.com/v1/verify?email=${encodeURIComponent(
    email,
  )}&apikey=${encodeURIComponent(key)}`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return { valid: false };
    const j = (await r.json()) as {
      result?: string;
      reason?: string;
      disposable?: string | boolean;
      accept_all?: string | boolean;
      role?: string | boolean;
      free?: string | boolean;
      did_you_mean?: string;
      safe_to_send?: string | boolean;
      success?: string | boolean;
    };
    const truthy = (v: string | boolean | undefined) =>
      v === true || v === 'true';
    const result = j.result ?? 'unknown';
    return {
      // QEV treats `valid` + `unknown` as deliverable (unknown = catch-all etc.)
      // We're conservative: only block on explicit `invalid`.
      valid: result !== 'invalid',
      result,
      reason: j.reason,
      disposable: truthy(j.disposable),
      acceptAll: truthy(j.accept_all),
      role: truthy(j.role),
      free: truthy(j.free),
      ...(j.did_you_mean ? { didYouMean: j.did_you_mean } : {}),
      safeToSend: truthy(j.safe_to_send),
    };
  } catch {
    return { valid: false };
  }
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 });
  }

  const phone = (body.phone ?? '').trim();
  const email = (body.email ?? '').trim().toLowerCase();
  if (!phone && !email) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const [phoneRes, emailRes] = await Promise.all([
    phone ? lookupPhone(phone) : Promise.resolve<TwilioResult>({ stubbed: true }),
    email ? verifyEmail(email) : Promise.resolve<EmailResult>({ stubbed: true }),
  ]);

  const stubbed =
    ('stubbed' in phoneRes && phoneRes.stubbed) &&
    ('stubbed' in emailRes && emailRes.stubbed);

  return NextResponse.json({
    stubbed,
    phone: phoneRes,
    email: emailRes,
  });
}
