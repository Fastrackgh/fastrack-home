// Shared Playwright helpers for the QA browser walk-through (throwaway env: FE :3101 -> BE :3100 -> fastrack_qa).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// Optional: point at an already-downloaded Chromium instead of the one bundled with the installed Playwright.
const EXE = process.env.PW_CHROMIUM || undefined;
const FE = process.env.FE_URL || 'http://localhost:3101';
const OUT = process.env.SHOTS_DIR || path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });

const DEMO_PW = 'S3curePassw0rd!';

// Super admin credentials are read from the backend env files and never printed.
function superAdmin() {
  const dir = process.env.BACKEND_DIR || path.resolve(__dirname, '../../../../fastrack-space/fastrack-backend');
  const vals = {};
  for (const f of ['.env.development', '.env']) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^(SUPER_ADMIN_EMAIL|SUPER_ADMIN_PASSWORD)=(.*)$/);
      if (m && !(m[1] in vals)) vals[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
  return { email: vals.SUPER_ADMIN_EMAIL, password: vals.SUPER_ADMIN_PASSWORD };
}

async function newSession(browser, opts = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  const page = await context.newPage();
  const events = { console: [], api: [], pageErrors: [] };
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') events.console.push(`[${m.type()}] ${m.text().slice(0, 300)}`);
  });
  page.on('pageerror', (e) => events.pageErrors.push(e.message.slice(0, 300)));
  page.on('response', async (r) => {
    const u = r.url();
    if (!u.includes(':3100/')) return;
    const entry = { m: r.request().method(), u: u.replace('http://localhost:3100', ''), s: r.status() };
    if (r.status() >= 400) {
      try { entry.body = (await r.text()).slice(0, 250); } catch {}
    }
    events.api.push(entry);
  });
  return { context, page, events };
}

async function login(page, email, password) {
  await page.goto(`${FE}/school-admin/login`, { waitUntil: 'networkidle' });
  await page.getByLabel('School email').fill(email);
  await page.getByLabel('Password', { exact: false }).first().fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
  return page.url();
}

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function visibleText(page, max = 1500) {
  const t = await page.locator('main').innerText().catch(() => page.locator('body').innerText());
  return t.replace(/\n{2,}/g, '\n').slice(0, max);
}

async function launch() {
  return chromium.launch({ executablePath: EXE });
}

module.exports = { launch, newSession, login, shot, visibleText, superAdmin, FE, DEMO_PW, OUT };
