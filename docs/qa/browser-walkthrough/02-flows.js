// Pass 2: targeted user journeys through the UI. Usage: node 02-flows.js [flowName ...]
const fs = require('fs');
const { launch, newSession, login, shot, visibleText, superAdmin, FE, DEMO_PW } = require('./harness');

const PRINCIPAL = 'head@fastrack.school';
const AO = 'accounts@fastrack.school';
const toastText = (page) => page.locator('.mantine-Notification-root').allInnerTexts().catch(() => []);

const flows = {
  // Login error messages, enumeration, forgot-password affordance.
  async loginErrors(browser) {
    const { context, page, events } = await newSession(browser);
    const out = {};
    await page.goto(`${FE}/school-admin/login`, { waitUntil: 'networkidle' });
    out.forgotLink = await page.getByText(/forgot/i).count();
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(800);
    out.emptySubmit = (await visibleText(page, 2000)).match(/.*(required|enter|invalid).*/gi);
    for (const [k, email, pw] of [['wrongPw', PRINCIPAL, 'nope-nope-1'], ['unknownEmail', 'ghost@nowhere.school', 'nope-nope-1']]) {
      await page.getByLabel('School email').fill(email);
      await page.getByLabel('Password').first().fill(pw);
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(1500);
      out[k] = { alerts: await page.locator('[role="alert"], .mantine-Alert-message').allInnerTexts(), toasts: await toastText(page) };
    }
    await shot(page, 'flow-login-errors');
    out.api = events.api.map((a) => `${a.m} ${a.u} ${a.s} ${a.body || ''}`);
    await context.close();
    return out;
  },

  // The link the backend puts in invitation emails.
  async inviteLink(browser) {
    const { context, page } = await newSession(browser);
    const out = {};
    for (const p of ['/auth/setup-password?token=abc123', '/school-admin/setup-password?token=abc123', '/school-admin/forgot-password']) {
      const r = await page.goto(`${FE}${p}`, { waitUntil: 'networkidle' });
      out[p] = { status: r.status(), text: (await page.locator('body').innerText()).slice(0, 160) };
    }
    await shot(page, 'flow-invite-link');
    await context.close();
    return out;
  },

  // Marketing waitlist + contact forms: does anything leave the browser?
  async marketingForms(browser) {
    const { context, page } = await newSession(browser);
    const sent = [];
    page.on('request', (r) => { if (['POST', 'PUT'].includes(r.method())) sent.push(`${r.method()} ${r.url()}`); });
    await page.goto(`${FE}/`, { waitUntil: 'networkidle' });
    const out = {};
    await page.goto(`${FE}/coming-soon`, { waitUntil: 'networkidle' });
    try {
      await page.getByLabel('School / Institution Name').fill('QA Test Academy');
      await page.getByLabel('Headmaster / Administrator Name').fill('QA Tester');
      await page.getByLabel('Official Email Address').fill('qa@example.com');
      await page.getByLabel('Phone / WhatsApp Number').fill('0244000000');
      const before = sent.length;
      await page.getByLabel('Official Email Address').press('Enter');
      await page.waitForTimeout(2000);
      out.waitlist = { requestsSent: sent.slice(before), screenText: (await page.locator('body').innerText()).match(/.*(thank|success|received|waitlist).*/gi)?.slice(0, 3) };
      await shot(page, 'flow-waitlist-submitted');
    } catch (e) { out.waitlist = { error: e.message.slice(0, 200) }; }
    try {
      await page.goto(`${FE}/`, { waitUntil: 'networkidle' });
      await page.getByLabel('Your Name').fill('QA Tester');
      const emails = page.getByLabel(/email/i);
      await emails.last().fill('qa@example.com');
      const before = sent.length;
      await page.getByLabel('Your Name').press('Enter');
      await page.waitForTimeout(2000);
      out.contact = { requestsSent: sent.slice(before), screenText: (await page.locator('body').innerText()).match(/.*(thank|sent|received).*/gi)?.slice(0, 3) };
    } catch (e) { out.contact = { error: e.message.slice(0, 200) }; }
    await context.close();
    return out;
  },

  // Generate invoices, check the toast and KPI cards, then double-click Record Payment.
  async feesJourney(browser) {
    const { context, page, events } = await newSession(browser);
    const out = {};
    await login(page, AO, DEMO_PW);
    await page.goto(`${FE}/school-admin/fees`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Generate Term Invoices/ }).click();
    await page.waitForTimeout(600);
    await shot(page, 'flow-fees-generate-modal');
    await page.locator('#btn-confirm-generate').click();
    await page.waitForTimeout(3000);
    out.generateToasts = await toastText(page);
    out.generateApi = events.api.filter((a) => a.m === 'POST').map((a) => `${a.m} ${a.u} ${a.s} ${a.body || ''}`);
    await page.waitForTimeout(1500);
    await shot(page, 'flow-fees-after-generate');
    out.kpis = (await page.locator('main').innerText()).match(/(TOTAL INVOICED|TOTAL COLLECTED|OUTSTANDING ARREARS|COLLECTION EFFICIENCY)\n[^\n]+\n[^\n]+/g);

    // Record a payment and double-click submit.
    events.api.length = 0;
    await page.getByRole('button', { name: /^Record Payment$/ }).click();
    await page.waitForTimeout(800);
    const picker = page.locator('#select-pay-student');
    await picker.click();
    await picker.fill('Yaw');
    await page.waitForTimeout(800);
    await picker.press('ArrowDown');
    await picker.press('Enter');
    await page.getByLabel('Payment Amount (GHS)').fill('50');
    await shot(page, 'flow-fees-payment-form');
    await page.locator('#btn-confirm-payment').dblclick();
    await page.waitForTimeout(3000);
    out.paymentPosts = events.api.filter((a) => a.m === 'POST').map((a) => `${a.m} ${a.u} ${a.s} ${a.body || ''}`);
    out.paymentToasts = await toastText(page);
    await shot(page, 'flow-fees-after-payment');
    await context.close();
    return out;
  },

  // Staff directory: who is listed compared with the school's actual staff.
  async staffDirectory(browser) {
    const { context, page } = await newSession(browser);
    await login(page, PRINCIPAL, DEMO_PW);
    await page.goto(`${FE}/school-admin/staff`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await shot(page, 'flow-staff');
    const text = await visibleText(page, 3000);
    await context.close();
    return { text };
  },

  // Logout: does it call the server, and does the old refresh token still work?
  async logout(browser) {
    const { context, page, events } = await newSession(browser);
    await login(page, PRINCIPAL, DEMO_PW);
    const keys = await page.evaluate(() => Object.keys(localStorage));
    const refresh = await page.evaluate(() => Object.entries(localStorage).find(([k]) => /refresh/i.test(k))?.[1]);
    events.api.length = 0;
    await page.locator('header button').last().click();
    await page.waitForTimeout(1500);
    const afterUrl = new URL(page.url()).pathname;
    const confirmVisible = await page.getByRole('dialog').count();
    if (confirmVisible) { await page.getByRole('button', { name: /log ?out|sign ?out|confirm/i }).last().click(); await page.waitForTimeout(1500); }
    const out = {
      storageKeysBefore: keys,
      urlAfter: new URL(page.url()).pathname,
      firstUrlAfterClick: afterUrl,
      logoutCalls: events.api.filter((a) => a.u.includes('/auth/logout')).length,
      storageAfter: await page.evaluate(() => Object.keys(localStorage)),
    };
    const r = await fetch('http://localhost:3100/api/auth/refresh', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken: refresh }) });
    out.oldRefreshTokenAfterLogout = r.status;
    await page.goBack();
    await page.waitForTimeout(1500);
    out.backButtonUrl = new URL(page.url()).pathname;
    await context.close();
    return out;
  },

  // Two tabs with an expired access token refresh at the same time.
  async multiTabRefresh(browser) {
    const { context, page } = await newSession(browser);
    await login(page, PRINCIPAL, DEMO_PW);
    const tab2 = await context.newPage();
    await tab2.goto(`${FE}/school-admin/students`, { waitUntil: 'networkidle' });
    const accessKey = await page.evaluate(() => Object.keys(localStorage).find((k) => /access/i.test(k)));
    await page.evaluate((k) => localStorage.setItem(k, 'expired.token.value'), accessKey);
    await Promise.all([
      page.goto(`${FE}/school-admin/fees`, { waitUntil: 'networkidle' }),
      tab2.goto(`${FE}/school-admin/students`, { waitUntil: 'networkidle' }),
    ]);
    await page.waitForTimeout(2500);
    const out = { tab1: new URL(page.url()).pathname, tab2: new URL(tab2.url()).pathname };
    await page.goto(`${FE}/school-admin/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    out.tab1AfterNextNavigation = new URL(page.url()).pathname;
    await shot(page, 'flow-multitab-after');
    await context.close();
    return out;
  },

  // A network blip during token refresh.
  async networkBlip(browser) {
    const { context, page } = await newSession(browser);
    await login(page, PRINCIPAL, DEMO_PW);
    const accessKey = await page.evaluate(() => Object.keys(localStorage).find((k) => /access/i.test(k)));
    await page.evaluate((k) => localStorage.setItem(k, 'expired.token.value'), accessKey);
    await page.route('**/api/auth/refresh', (r) => r.abort('internetdisconnected'));
    await page.goto(`${FE}/school-admin/students`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const out = { urlAfterBlip: new URL(page.url()).pathname, storage: await page.evaluate(() => Object.keys(localStorage)) };
    await shot(page, 'flow-network-blip');
    await context.close();
    return out;
  },

  // A failing list request: does the UI say so, or show an empty table?
  async apiFailure(browser) {
    const { context, page } = await newSession(browser);
    await login(page, PRINCIPAL, DEMO_PW);
    await page.route('**/api/schools/me/students?page*', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{"success":false,"statusCode":500,"message":"Internal server error"}' }));
    await page.goto(`${FE}/school-admin/students`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await shot(page, 'flow-api-failure-students');
    const out = { students: { toasts: await toastText(page), text: (await visibleText(page, 1500)).slice(-500) } };
    await page.unroute('**/api/schools/me/students?page*');
    await page.route('**/api/schools/me/invoices*', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{"success":false,"statusCode":500,"message":"Internal server error"}' }));
    await page.goto(`${FE}/school-admin/fees`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await shot(page, 'flow-api-failure-fees');
    out.fees = { toasts: await toastText(page), text: (await visibleText(page, 1500)).slice(0, 700) };
    await context.close();
    return out;
  },

  // Super Admin switches Fees off for FIS-001 while the Account Officer has the page open, then suspends the school.
  async platformControls(browser) {
    const out = {};
    const ao = await newSession(browser);
    await login(ao.page, AO, DEMO_PW);
    await ao.page.goto(`${FE}/school-admin/fees`, { waitUntil: 'networkidle' });

    const sa = await newSession(browser);
    const s = superAdmin();
    await login(sa.page, s.email, s.password);
    await sa.page.waitForTimeout(1500);
    await shot(sa.page, 'flow-sa-platform');
    await sa.page.goto(`${FE}/school-admin/platform/schools/${process.env.FIS_ID}`, { waitUntil: 'networkidle' });
    await sa.page.waitForLoadState('networkidle');
    await sa.page.waitForTimeout(1000);
    await shot(sa.page, 'flow-sa-school-detail');
    out.saDetailUrl = new URL(sa.page.url()).pathname;

    // Switch the Fees module off.
    await sa.page.getByRole('tab', { name: 'Modules' }).click();
    await sa.page.waitForTimeout(1500);
    await shot(sa.page, 'flow-sa-modules-tab');
    out.modulesTabText = (await sa.page.locator('[role=tabpanel]:visible').innerText()).slice(0, 900);
    const feesRow = sa.page.locator('[role=tabpanel]:visible tr, [role=tabpanel]:visible .mantine-Paper-root').filter({ hasText: /Fees/ }).filter({ has: sa.page.locator('input[type=checkbox], [role=switch]') }).first();
    sa.events.api.length = 0;
    await feesRow.locator('input[type=checkbox], [role=switch]').first().dispatchEvent('click');
    await sa.page.waitForTimeout(2000);
    out.moduleToggleApi = sa.events.api.filter((a) => a.m !== 'GET').map((a) => `${a.m} ${a.u} ${a.s} ${a.body || ''}`);
    out.moduleToggleToasts = await toastText(sa.page);

    // The AO's open page: what happens on the next action?
    ao.events.api.length = 0;
    await ao.page.getByRole('button', { name: /Refresh/ }).first().click();
    await ao.page.waitForTimeout(2000);
    out.aoAfterModuleOff = { url: new URL(ao.page.url()).pathname, toasts: await toastText(ao.page), api: ao.events.api.map((a) => `${a.m} ${a.u} ${a.s}`).slice(0, 6) };
    await shot(ao.page, 'flow-ao-module-off');
    await ao.page.goto(`${FE}/school-admin/fees`, { waitUntil: 'networkidle' });
    await ao.page.waitForTimeout(1500);
    out.aoReloadAfterModuleOff = { url: new URL(ao.page.url()).pathname, nav: await ao.page.locator('aside a').allInnerTexts() };
    await shot(ao.page, 'flow-ao-module-off-reload');

    // Switch it back on.
    await feesRow.locator('input[type=checkbox], [role=switch]').first().dispatchEvent('click');
    await sa.page.waitForTimeout(1500);

    // Deactivate the school from the UI.
    await sa.page.getByRole('tab', { name: 'Overview' }).click();
    sa.events.api.length = 0;
    await sa.page.getByRole('button', { name: /^Deactivate$/ }).click();
    await sa.page.waitForTimeout(800);
    if (await sa.page.getByRole('dialog').count()) {
      await shot(sa.page, 'flow-sa-deactivate-confirm');
      await sa.page.getByRole('dialog').getByRole('button', { name: /deactivate|confirm|yes/i }).last().click();
    }
    await sa.page.waitForTimeout(2000);
    out.deactivateApi = sa.events.api.filter((a) => a.m !== 'GET').map((a) => `${a.m} ${a.u} ${a.s}`);
    out.deactivateToasts = await toastText(sa.page);
    await shot(sa.page, 'flow-sa-after-deactivate');

    // Fresh login for the suspended school's principal, plus the AO's already-open session.
    const p = await newSession(browser);
    out.suspendedPrincipalLogin = new URL(await login(p.page, PRINCIPAL, DEMO_PW)).pathname;
    await p.page.goto(`${FE}/school-admin/students`, { waitUntil: 'networkidle' });
    await p.page.waitForTimeout(1500);
    out.suspendedPrincipalStudents = { url: new URL(p.page.url()).pathname, text: (await visibleText(p.page, 400)) };
    await shot(p.page, 'flow-suspended-principal');
    await ao.page.reload({ waitUntil: 'networkidle' });
    out.suspendedAoSession = new URL(ao.page.url()).pathname;

    // Re-activate.
    await sa.page.getByRole('button', { name: /^Activate$/ }).click().catch(() => {});
    await sa.page.waitForTimeout(800);
    if (await sa.page.getByRole('dialog').count()) await sa.page.getByRole('dialog').getByRole('button', { name: /activate|confirm|yes/i }).last().click();
    await sa.page.waitForTimeout(1500);
    for (const s2 of [ao, sa, p]) await s2.context.close();
    return out;
  },

  // Phone-width layout of the main working pages.
  async mobile(browser) {
    const { context, page } = await newSession(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await login(page, PRINCIPAL, DEMO_PW);
    const out = {};
    for (const r of ['dashboard', 'students', 'fees', 'staff']) {
      await page.goto(`${FE}/school-admin/${r}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      out[r] = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      await page.screenshot({ path: `${require('./harness').OUT}/mobile-${r}.png` });
    }
    await context.close();
    return out;
  },
};

(async () => {
  const pick = process.argv.slice(2);
  const browser = await launch();
  const results = fs.existsSync(__dirname + '/02-flows.json') ? JSON.parse(fs.readFileSync(__dirname + '/02-flows.json')) : {};
  for (const name of pick.length ? pick : Object.keys(flows)) {
    try { results[name] = await flows[name](browser); } catch (e) { results[name] = { error: e.message.slice(0, 400) }; }
    console.log(`== ${name}\n${JSON.stringify(results[name], null, 1).slice(0, 2500)}`);
  }
  fs.writeFileSync(__dirname + '/02-flows.json', JSON.stringify(results, null, 2));
  await browser.close();
})();
