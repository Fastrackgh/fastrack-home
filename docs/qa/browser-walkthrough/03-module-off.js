// Super Admin switches Fees & Billing off for FIS-001 while the Account Officer has the Fees page open.
const { launch, newSession, login, shot, superAdmin, FE, DEMO_PW } = require('./harness');
const toastText = (page) => page.locator('.mantine-Notification-root').allInnerTexts().catch(() => []);

(async () => {
  const browser = await launch();
  const out = {};
  const ao = await newSession(browser);
  await login(ao.page, 'accounts@fastrack.school', DEMO_PW);
  await ao.page.goto(`${FE}/school-admin/fees`, { waitUntil: 'networkidle' });

  const sa = await newSession(browser);
  const s = superAdmin();
  await login(sa.page, s.email, s.password);
  await sa.page.goto(`${FE}/school-admin/platform/schools/${process.env.FIS_ID}`, { waitUntil: 'networkidle' });
  await sa.page.getByRole('tab', { name: 'Modules' }).click();
  await sa.page.waitForTimeout(1200);
  const feesSwitch = sa.page.locator('xpath=//*[normalize-space(text())="Fees & Billing"]/ancestor::*[.//input[@role="switch"]][1]//input[@role="switch"]').first();
  out.feesSwitchBefore = await feesSwitch.isChecked();
  sa.events.api.length = 0;
  await feesSwitch.dispatchEvent('click');
  await sa.page.waitForTimeout(2000);
  out.feesSwitchAfter = await feesSwitch.isChecked();
  out.toggleApi = sa.events.api.filter((a) => a.m !== 'GET').map((a) => `${a.m} ${a.u} ${a.s}`);
  await shot(sa.page, 'flow-sa-fees-off');

  // The AO's already-open page: buttons still shown? What does an action do?
  ao.events.api.length = 0;
  await ao.page.getByRole('button', { name: /Refresh/ }).first().click();
  await ao.page.waitForTimeout(2500);
  out.aoRefresh = { url: new URL(ao.page.url()).pathname, toasts: await toastText(ao.page), api: ao.events.api.map((a) => `${a.m} ${a.u} ${a.s}`) };
  out.aoButtonsStillShown = await ao.page.getByRole('button', { name: /Record Payment|Generate Term Invoices/ }).count();
  await shot(ao.page, 'flow-ao-fees-off-open-page');

  // Reload: does the page/nav item disappear?
  await ao.page.goto(`${FE}/school-admin/fees`, { waitUntil: 'networkidle' });
  await ao.page.waitForTimeout(2000);
  out.aoReload = { url: new URL(ao.page.url()).pathname, navHasFees: (await ao.page.locator('aside a').allInnerTexts()).includes('Fees & Billing') };
  await shot(ao.page, 'flow-ao-fees-off-reload');

  // Fresh login.
  const ao2 = await newSession(browser);
  await login(ao2.page, 'accounts@fastrack.school', DEMO_PW);
  out.freshLoginNav = await ao2.page.locator('aside a').allInnerTexts();
  await ao2.page.goto(`${FE}/school-admin/fees`, { waitUntil: 'networkidle' });
  await ao2.page.waitForTimeout(1500);
  out.freshLoginFeesUrl = new URL(ao2.page.url()).pathname;

  // Restore.
  await feesSwitch.dispatchEvent('click');
  await sa.page.waitForTimeout(1500);
  out.restored = await feesSwitch.isChecked();
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
