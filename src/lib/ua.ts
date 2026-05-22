const IN_APP_TOKENS = /\b(FBAN|FBAV|Instagram|TikTok|musical_ly|Snapchat|LinkedInApp|Line\/|Reddit|GSA\/|Twitter|X-Client|Pinterest)\b/i;

export function isInAppWebView(ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''): boolean {
  if (!ua) return false;
  return IN_APP_TOKENS.test(ua);
}
