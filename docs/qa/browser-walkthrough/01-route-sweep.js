// Pass 1: log in as each role and visit every route. Records landing URL, final URL, sidebar, API errors, console errors.
const fs = require('fs');
const { launch, newSession, login, shot, visibleText, superAdmin, FE, DEMO_PW } = require('./harness');

const ROLES = [
  { key: 'principal', email: 'head@fastrack.school' },
  { key: 'academic_head', email: 'academic@fastrack.school' },
  { key: 'teacher', email: 'kwame.mensah@fastrack.school' },
  { key: 'account_officer', email: 'accounts@fastrack.school' },
  { key: 'secretary', email: 'akosua.boateng@fastrack.school' },
  { key: 'super_admin', ...superAdmin() },
];
const ROUTES = ['dashboard', 'students', 'fees', 'staff', 'attendance', 'calendar', 'templates', 'admissions', 'platform'];

(async () => {
  const browser = await launch();
  const report = {};
  for (const r of ROLES) {
    const { context, page, events } = await newSession(browser);
    const landing = await login(page, r.email, r.password || DEMO_PW);
    const nav = await page.locator('nav a, aside a').evaluateAll((as) => as.map((a) => `${a.innerText.trim().replace(/\n/g, ' ')} -> ${a.getAttribute('href')}`)).catch(() => []);
    await shot(page, `${r.key}-00-landing`);
    const routes = {};
    for (const route of ROUTES) {
      events.api.length = 0; events.console.length = 0; events.pageErrors.length = 0;
      await page.goto(`${FE}/school-admin/${route}`, { waitUntil: 'networkidle' }).catch(() => {});
      await page.waitForTimeout(1200);
      const final = new URL(page.url()).pathname;
      await shot(page, `${r.key}-${route}`);
      routes[route] = {
        final,
        text: (await visibleText(page, 600)),
        apiErrors: events.api.filter((a) => a.s >= 400),
        apiCalls: events.api.map((a) => `${a.m} ${a.u} ${a.s}`),
        console: events.console.slice(0, 6),
        pageErrors: events.pageErrors.slice(0, 4),
      };
    }
    report[r.key] = { landing: new URL(landing).pathname, nav: [...new Set(nav)], routes };
    await context.close();
    console.log(`done ${r.key}: landed ${report[r.key].landing}`);
  }
  fs.writeFileSync(__dirname + '/01-route-sweep.json', JSON.stringify(report, null, 2));
  await browser.close();
})();
