import { test, type Page } from '@playwright/test';

const ADMIN_USER = 'admin@gmail.com';
const ADMIN_PASS = 'admin@123';

test('DIAG-reminders-add: capture network + console for /reminders/add', async ({ page }) => {
  // Login via localStorage seed (fast) then go straight to the page.
  const login = await page.request.post('http://localhost:5000/api/authentication', {
    data: { userName: ADMIN_USER, password: ADMIN_PASS },
  });
  const auth = await login.json();
  await page.goto('/#/login');
  await page.evaluate(({ token, authObj }) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('auth_obj', JSON.stringify(authObj));
    localStorage.setItem('userMenus', JSON.stringify(authObj.menus || []));
  }, { token: auth.bearerToken, authObj: auth });

  const emitted: string[] = [];
  page.on('request', (req) => {
    const u = req.url().replace('http://localhost:5000', '');
    if (emitted.length < 120) emitted.push(`REQ ${req.method()} ${u}`);
  });
  page.on('response', (res) => {
    const u = res.url().replace('http://localhost:5000', '');
    if (res.status() >= 400 && emitted.length < 160) emitted.push(`RESP ${res.status()} ${u}`);
  });
  page.on('pageerror', (err) => emitted.push(`PAGEERR ${err.message}`));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') emitted.push(`CONSOLE-${m.type()} ${m.text()}`); });

  // Use a short manual timeout; use race so we can time-box the hang.
  const pending = [page.goto('/#/reminders/add', { waitUntil: 'domcontentloaded' })];
  const result = await Promise.race([
    Promise.all(pending).then(() => 'loaded'),
    new Promise<string>((res) => { setTimeout(() => res('HUNG-20s'), 20_000); }),
  ]);
  console.log('LOAD RESULT:', result);
  console.log('ACTIONS for /reminders/add:');
  for (const e of emitted) console.log('  ' + e);
  test.expect(1).toBe(1);
});
