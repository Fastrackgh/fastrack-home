import { NextRequest, NextResponse } from 'next/server';
import {
  GUIDE_COOKIE,
  GUIDE_COOKIE_MAX_AGE,
  codeMatches,
  guideCode,
  hasPass,
  passFor,
  recordWrongCode,
  tooManyTries,
} from '@/content/business-guide/access';
import { BUSINESS_GUIDE_HTML } from '@/content/business-guide/guide-html.generated';

/**
 * The Business Guide for Fastrack's business team (built from the backend repo's
 * docs/business/). Anyone with the link can open it after entering the access code.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
};

function lockPage(message: string | null, status = 200): NextResponse {
  const locked = !guideCode();
  const body = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Fastrack Business Guide</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&family=Sora:wght@700&display=swap">
<style>
  :root { --bg: #fbf9f9; --surface: #fff; --fg: #1f1a1c; --muted: #675f63; --line: #ebe4e6; --accent: #cb1323; --on-accent: #fff; --error: #b42318; }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #151214; --surface: #1d191b; --fg: #efe9eb; --muted: #a99fa4; --line: #342c30; --accent: #f38a97; --on-accent: #1f1a1c; --error: #ff8a80; color-scheme: dark; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--bg); color: var(--fg);
    font: 16px/1.6 "Manrope", -apple-system, "Segoe UI", sans-serif; padding: 24px 16px; }
  main { width: 100%; max-width: 380px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 28px; }
  h1 { font: 700 1.35rem "Sora", -apple-system, sans-serif; margin: 0 0 6px; letter-spacing: -0.01em; }
  h1 span { color: var(--accent); }
  p { margin: 0 0 18px; color: var(--muted); font-size: 0.95rem; }
  label { display: block; font-weight: 600; font-size: 0.9rem; margin-bottom: 6px; }
  input { width: 100%; font: inherit; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); color: var(--fg); }
  input:focus-visible, button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  button { margin-top: 14px; width: 100%; font: inherit; font-weight: 700; padding: 10px; border: 0; border-radius: 8px; background: var(--accent); color: var(--on-accent); cursor: pointer; }
  .error { color: var(--error); font-size: 0.9rem; margin: 10px 0 0; }
</style>
</head>
<body>
<main>
  <h1>Fastrack <span>Business Guide</span></h1>
  ${
    locked
      ? '<p>The guide isn’t available yet. Ask the product team to turn it on.</p>'
      : `<p>Enter the access code you were given to read the guide.</p>
  <form method="post" action="/guide">
    <label for="code">Access code</label>
    <input id="code" name="code" type="password" autocomplete="current-password" required autofocus>
    ${message ? `<p class="error" role="alert">${message}</p>` : ''}
    <button type="submit">Open the guide</button>
  </form>`
  }
</main>
</body>
</html>`;
  return new NextResponse(body, { status, headers: HEADERS });
}

function address(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function GET(request: NextRequest) {
  if (hasPass(request.cookies.get(GUIDE_COOKIE)?.value)) {
    return new NextResponse(BUSINESS_GUIDE_HTML, { headers: HEADERS });
  }
  return lockPage(null);
}

export async function POST(request: NextRequest) {
  const code = guideCode();
  if (!code) return lockPage(null, 503);
  const from = address(request);
  if (tooManyTries(from)) {
    return lockPage('Too many wrong codes. Try again in 15 minutes.', 429);
  }
  const form = await request.formData().catch(() => null);
  const entered = String(form?.get('code') ?? '');
  if (!codeMatches(entered)) {
    recordWrongCode(from);
    return lockPage('That code isn’t right. Check it and try again.', 401);
  }
  // A relative address, so it works behind any proxy.
  const response = new NextResponse(null, { status: 303, headers: { Location: '/guide' } });
  response.cookies.set(GUIDE_COOKIE, passFor(code), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/guide',
    maxAge: GUIDE_COOKIE_MAX_AGE,
  });
  return response;
}
