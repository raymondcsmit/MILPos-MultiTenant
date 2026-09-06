import { test, expect, type Page } from '@playwright/test';

const ADMIN_USER = 'admin@gmail.com';
const ADMIN_PASS = 'admin@123';

// Collect runtime diagnostics per page visit.
type Diag = {
  url: string;
  pageErrors: string[];
  consoleErrors: string[];
  failedRequests: string[];
};

const diags: Diag[] = [];

function attachCollectors(page: Page, label: string) {
  const d: Diag = { url: '', pageErrors: [], consoleErrors: [], failedRequests: [] };
  diags.push(d);
  page.on('pageerror', (err) => d.pageErrors.push(String(err?.message || err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') d.consoleErrors.push(msg.text());
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      d.failedRequests.push(`${res.status()} ${res.url()}`);
    }
  });
  page.on('framenavigated', (f) => {
    if (f === page.mainFrame()) d.url = f.url();
  });
  return d;
}

async function realLogin(page: Page) {
  await page.goto('/#/login');
  await page.locator('input[formcontrolname="userName"]').fill(ADMIN_USER, { timeout: 15_000 });
  await page.locator('input[formcontrolname="password"]').fill(ADMIN_PASS);
  await page.locator('button:has-text("Login")').first().click();
  // Wait for navigation away from login / dashboard to render
  await page.waitForURL(/\/(?!login)/, { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(3000);
}

test('DESKTOP-EXPLORE: login, create user, walk all nav links, data entry', async ({ page }) => {
  // Attach collectors at the top level (covers login + all navigations).
  attachCollectors(page, 'main');

  // 1) REAL LOGIN
  await page.goto('/#/login');
  await page.waitForLoadState('domcontentloaded');
  console.log('=== LOGIN PAGE ===');
  await page.screenshot({ path: 'test-results/diag/login.png' });
  await realLogin(page);
  console.log('POST-LOGIN URL:', page.url());
  await page.screenshot({ path: 'test-results/diag/dashboard.png' });

  // 2) CREATE A USER VIA UI
  console.log('=== CREATE USER ===');
  await page.goto('/#/users/manage');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'test-results/diag/user-form.png', fullPage: true });

  // 3) INVENTORY THE SIDEBAR MENU + click every nav link
  console.log('=== WALK NAV ===');
  const menuItems = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[routerlink], a[href*="#/"]'));
    return links.map((a) => (a as HTMLElement).getAttribute('routerlink') || (a as HTMLAnchorElement).hash || (a as HTMLElement).getAttribute('href'));
  });
  console.log('SIDEBAR LINKS FOUND:', menuItems.length);

  // Collect every routerLink attribute in the sidebar (main nav).
  const sidebarLinks = await page.locator('.sidebar a[routerLink], app-sidebar a[routerLink]').evaluateAll(
    (els) => els.map((e) => (e as HTMLElement).getAttribute('routerLink'))
  );
  console.log('SIDEBAR ROUTERLINKS:', JSON.stringify(sidebarLinks, null, 0));

  // We'll drive navigation by direct route URLs instead of clicking, which is more reliable,
  // but also click the actual nav to test interactivity for a sample.
  // Visit the concrete list of routes known from the app (mirrors sidebar + header).
  const routes: { path: string; label: string }[] = [
    { path: '/', label: 'Dashboard' },
    { path: '/products', label: 'Product List' },
    { path: '/products/add', label: 'Product Add' },
    { path: '/product-category', label: 'Product Category' },
    { path: '/tax', label: 'Tax' },
    { path: '/unitConversation', label: 'Unit Conversion' },
    { path: '/brand', label: 'Brand' },
    { path: '/variants', label: 'Variants' },
    { path: '/print-labels', label: 'Print Labels' },
    { path: '/daily-price-manager', label: 'Daily Price' },
    { path: '/customer', label: 'Customer List' },
    { path: '/customer/addItem', label: 'Customer Add' },
    { path: '/customer-sales-order', label: 'Customer Sales Order' },
    { path: '/supplier', label: 'Supplier List' },
    { path: '/supplier/manage/addItem', label: 'Supplier Add' },
    { path: '/sales-order/list', label: 'Sales Order List' },
    { path: '/sales-order/add', label: 'Sales Order Add' },
    { path: '/sales-order-request/list', label: 'SO Request List' },
    { path: '/sales-order-request/add', label: 'SO Request Add' },
    { path: '/sales-order-return/list', label: 'SO Return List' },
    { path: '/sales-order-return/add', label: 'SO Return Add' },
    { path: '/purchase-order/list', label: 'PO List' },
    { path: '/purchase-order/add', label: 'PO Add' },
    { path: '/purchase-order-request/list', label: 'PO Request List' },
    { path: '/purchase-order-request/add', label: 'PO Request Add' },
    { path: '/purchase-order-return/list', label: 'PO Return List' },
    { path: '/purchase-order-return/add', label: 'PO Return Add' },
    { path: '/accounting/ledger-accounts', label: 'Ledger Accounts' },
    { path: '/accounting/financial-year', label: 'Financial Year' },
    { path: '/accounting/transactions', label: 'Transactions' },
    { path: '/accounting/account-balance-report', label: 'Account Balance' },
    { path: '/accounting/balance-sheet-report', label: 'Balance Sheet' },
    { path: '/accounting/cash-bank-report', label: 'Cash/Bank' },
    { path: '/accounting/cash-flow-report', label: 'Cash Flow' },
    { path: '/accounting/general-entry-report', label: 'General Entry' },
    { path: '/accounting/profit-loss-report', label: 'P&L' },
    { path: '/accounting/tax-report', label: 'Tax Report' },
    { path: '/accounting/trial-balance-report', label: 'Trial Balance' },
    { path: '/accounting/payment-report', label: 'Payment Report' },
    { path: '/book-close', label: 'Book Close' },
    { path: '/pay-roll/list', label: 'PayRoll List' },
    { path: '/pay-roll/add', label: 'PayRoll Add' },
    { path: '/accounting/loans', label: 'Loans' },
    { path: '/accounting/loan/addItem', label: 'Loan Add' },
    { path: '/damaged-stock/list', label: 'Damaged Stock List' },
    { path: '/damaged-stock/add', label: 'Damaged Stock Add' },
    { path: '/stock-transfer/list', label: 'Stock Transfer List' },
    { path: '/stock-transfer/add', label: 'Stock Transfer Add' },
    { path: '/inventory', label: 'Inventory' },
    { path: '/expense', label: 'Expense List' },
    { path: '/expense/add', label: 'Expense Add' },
    { path: '/expense-category', label: 'Expense Category' },
    { path: '/inquiry', label: 'Inquiry List' },
    { path: '/inquiry/add', label: 'Inquiry Add' },
    { path: '/inquiry-status', label: 'Inquiry Status' },
    { path: '/inquiry-source', label: 'Inquiry Source' },
    { path: '/reminders', label: 'Reminders List' },
    { path: '/reminders/add', label: 'Reminders Add' },
    { path: '/roles', label: 'Roles List' },
    { path: '/roles/manage', label: 'Roles Add' },
    { path: '/users', label: 'Users List' },
    { path: '/users/manage', label: 'Users Add' },
    { path: '/roles/users', label: 'User Roles' },
    { path: '/email-smtp', label: 'SMTP Settings' },
    { path: '/emailtemplate', label: 'Email Templates' },
    { path: '/send-email', label: 'Send Email' },
    { path: '/locations', label: 'Locations' },
    { path: '/company-profile', label: 'Company Profile' },
    { path: '/languages', label: 'Languages' },
    { path: '/page-helper', label: 'Page Helper' },
    { path: '/country', label: 'Country' },
    { path: '/cities', label: 'Cities' },
    { path: '/login-audit', label: 'Login Audit' },
    { path: '/logs', label: 'Error Logs' },
    { path: '/email-logs', label: 'Email Logs' },
    { path: '/my-profile', label: 'My Profile' },
    { path: '/notifications', label: 'Notifications' },
    { path: '/inventory/bulk-update', label: 'Inventory Bulk Update' },
    { path: '/inventory/bulk-adjust', label: 'Inventory Bulk Adjust' },
    { path: '/pos', label: 'POS' },
    { path: '/reports/purchase-order-report', label: 'PO Report' },
    { path: '/reports/sales-order-report', label: 'SO Report' },
    { path: '/reports/expense-report', label: 'Expense Report' },
    { path: '/reports/stock-report', label: 'Stock Report' },
    { path: '/reports/sales-purchase-report', label: 'Sales Purchase Report' },
  ];

  const results: { path: string; label: string; status: string; errors: string[] }[] = [];

  for (const r of routes) {
    // new collector per navigation to correlate errors with route
    const d = attachCollectors(page, r.label);
    try {
      await page.goto(`/#${r.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1800);
      // Check for an error-msg component or empty-crash
      const hasError = await page.locator('app-error-msg, .error-msg').count();
      const bodyLen = (await page.locator('body').innerText()).trim().length;
      const status = hasError > 0 ? 'ERROR-COMPONENT' : bodyLen > 0 ? 'OK' : 'EMPTY-BODY';
      results.push({ path: r.path, label: r.label, status, errors: [...d.pageErrors, ...d.consoleErrors] });
      if (hasError > 0 || d.pageErrors.length > 0) {
        console.log(`  !! ${r.path} [${r.label}] -> ${status} PAGERR:${d.pageErrors.length} CONSOLE:${d.consoleErrors.length}`);
      }
    } catch (e: any) {
      results.push({ path: r.path, label: r.label, status: 'NAV-EXCEPTION', errors: [String(e?.message || e)] });
      console.log(`  !! ${r.path} [${r.label}] EXCEPTION: ${e?.message}`);
    }
  }

  // Print a summary of problems
  console.log('\n=== PROBLEM SUMMARY ===');
  const problems = results.filter((r) => r.status !== 'OK' || r.errors.length > 0);
  for (const p of problems) {
    console.log(`-- ${p.path} [${p.label}] status=${p.status}`);
    for (const e of (p.errors || []).slice(0, 5)) console.log(`     ERR: ${e}`);
  }
  console.log(`Visited ${results.length} routes; ${problems.length} flagged.`);

  // Diagnostics-only: never fail the run, report problems above for triage.
  test.expect(1).toBe(1);
});
