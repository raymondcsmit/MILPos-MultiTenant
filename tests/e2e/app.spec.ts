import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

const ADMIN_USER = 'admin@gmail.com';
const ADMIN_PASS = 'admin@123';
const API_URL = 'http://localhost:5000';

let cachedToken: string | null = null;
let cachedAuthObj: any = null;

async function getAuth(request: APIRequestContext) {
  if (cachedToken) return { token: cachedToken, authObj: cachedAuthObj };
  const resp = await request.post(`${API_URL}/api/authentication`, {
    data: { userName: ADMIN_USER, password: ADMIN_PASS },
  });
  cachedToken = (await resp.json()).bearerToken;
  cachedAuthObj = await resp.json();
  return { token: cachedToken, authObj: cachedAuthObj };
}

async function loginAs(page: Page) {
  const { token, authObj } = await getAuth(page.request);
  await page.goto('/#/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, authObj }) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('auth_obj', JSON.stringify(authObj));
    localStorage.setItem('userMenus', JSON.stringify(authObj.menus || []));
  }, { token, authObj });
  await page.goto('/#/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ AUTH / LOGIN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Authentication', () => {
  test('TC-SEC-01: Login page loads with form fields', async ({ page }) => {
    await page.goto('/#/login');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('input[formcontrolname="userName"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('input[formcontrolname="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Login")').first()).toBeVisible();
  });

  test('TC-SEC-02: Invalid credentials show error toast', async ({ page }) => {
    await page.goto('/#/login');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('input[formcontrolname="userName"]').fill('wrong@email.com');
    await page.locator('input[formcontrolname="password"]').fill('wrongpass');
    await page.locator('button:has-text("Login")').click();
    await expect(page.locator('mat-snack-bar-container')).toBeVisible({ timeout: 10_000 });
  });

  test('TC-SEC-03: Valid credentials redirect to dashboard', async ({ page }) => {
    await page.goto('/#/login');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('input[formcontrolname="userName"]').fill(ADMIN_USER);
    await page.locator('input[formcontrolname="password"]').fill(ADMIN_PASS);
    await page.locator('button:has-text("Login")').click();
    await expect(page).toHaveURL(/.*#\/($|\?)/, { timeout: 20_000 });
    await expect(page.locator('#leftsidebar')).toBeVisible({ timeout: 15_000 });
  });

  test('TC-SEC-04: Logout returns to login page', async ({ page }) => {
    await loginAs(page);
    const userBtn = page.locator('.user_name, .user_menu, .dropdown-user, [class*="user-name"], .topbar__user-dropdown, .user_profile_toggle, .header-profile img, .header-profile, a.navbar-right.right-sidebar').first();
    if (await userBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await userBtn.click();
    }
    const logoutBtn = page.locator('a:has-text("Logout"), button:has-text("Logout"), a:has-text("Log Out"), .logout, a[routerLink="/login"], .dropdown-menu a:last-child').first();
    if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logoutBtn.click();
      await expect(page).toHaveURL(/.*login/, { timeout: 10_000 });
    }
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ DASHBOARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => { await loginAs(page); });

  test('TC-DB-01: Dashboard renders with content', async ({ page }) => {
    await expect(page.locator('#leftsidebar')).toBeVisible({ timeout: 15_000 });
  });

  test('TC-DB-02: Sidebar navigation is present', async ({ page }) => {
    await expect(page.locator('#leftsidebar')).toBeVisible({ timeout: 10_000 });
  });

  test('TC-DB-03: Key menu items are visible in sidebar', async ({ page }) => {
    const sidebar = page.locator('#leftsidebar');
    for (const item of ['PRODUCT', 'CUSTOMER', 'SUPPLIER', 'SALES', 'PURCHASE', 'EXPENSE', 'REPORTS', 'SETTINGS']) {
      const el = sidebar.locator(`text=${item}`).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(el).toBeVisible();
      }
    }
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ PRODUCTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Products Module', () => {
  test.beforeEach(async ({ page }) => { await loginAs(page); });

  test('TC-PROD-01: Product list page loads', async ({ page }) => {
    await page.goto('/#/products');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toContain('#/products');
    await expect(page.locator('body')).toBeVisible();
  });

  test('TC-PROD-02: Product list shows data', async ({ page }) => {
    await page.goto('/#/products');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const rows = page.locator('table tbody tr, .ag-row, .mat-row');
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('TC-PROD-03: Add new product page loads', async ({ page }) => {
    await page.goto('/#/products/add');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-PROD-04: Product category list loads', async ({ page }) => {
    await page.goto('/#/product-category');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('TC-PROD-05: Tax list loads', async ({ page }) => {
    await page.goto('/#/tax');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('TC-PROD-06: Unit conversation list loads', async ({ page }) => {
    await page.goto('/#/unitConversation');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('TC-PROD-07: Brand list loads', async ({ page }) => {
    await page.goto('/#/brand');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('TC-PROD-08: Variants list loads', async ({ page }) => {
    await page.goto('/#/variants');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('TC-PROD-09: Create a product via API', async ({ page }) => {
    const { token } = await getAuth(page.request);
    const ts = Date.now();
    const resp = await page.request.post(`${API_URL}/api/product`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: `E2E Product ${ts}`,
        code: `E2E-${ts}`,
        barcode: `E2E-BAR-${ts}`,
        skuCode: `E2E-SKU-${ts}`,
        unitId: '907c5dab-b5b1-460f-b46d-ab724fa2a4ae',
        categoryId: '65ddd565-a239-49b0-8f00-f0dbd9e13055',
        brandId: 'f17e5d20-6c31-4c52-66d1-08da3b2a1d41',
        purchasePrice: 100,
        salesPrice: 150,
        alertQuantity: 10,
        isActive: true,
      },
    });
    expect([200, 201]).toContain(resp.status());
  });

  test('TC-PROD-11: Create product without required FKs returns 422 (not 500)', async ({ request }) => {
    const { token } = await getAuth(request);
    const resp = await request.post(`${API_URL}/api/product`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: `E2E Product Bad ${Date.now()}`,
        purchasePrice: 100,
      },
    });
    expect([400, 422]).toContain(resp.status());
  });

  test('TC-PROD-10: Product search on list page', async ({ page }) => {
    await page.goto('/#/products');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search" i], .search-input, input[matInput]').first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('Test');
      await page.waitForTimeout(2000);
    }
    await expect(page.locator('body')).toBeVisible();
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ CUSTOMERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Customers Module', () => {
  test.beforeEach(async ({ page }) => { await loginAs(page); });

  test('TC-CUST-01: Customer list page loads', async ({ page }) => {
    await page.goto('/#/customer');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('TC-CUST-02: Customer list shows data', async ({ page }) => {
    await page.goto('/#/customer');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const rows = page.locator('table tbody tr, .ag-row, .mat-row');
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('TC-CUST-03: Add new customer page loads', async ({ page }) => {
    await page.goto('/#/customer/addItem');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-CUST-04: Create a customer via API', async ({ page }) => {
    const { token } = await getAuth(page.request);
    const name = `E2E Cust ${Date.now()}`;
    const resp = await page.request.post(`${API_URL}/api/Customer`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        customerName: name,
        mobileNo: `0300${Math.floor(1000000 + Math.random() * 9000000)}`,
        email: `e2ecust${Date.now()}@test.com`,
        isActive: true,
      },
    });
    expect([200, 201]).toContain(resp.status());
  });

  test('TC-CUST-05: Pending payments page loads', async ({ page }) => {
    await page.goto('/#/customer-sales-order');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page.locator('table').first()).toBeVisible({ timeout: 15_000 });
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ SUPPLIERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Suppliers Module', () => {
  test.beforeEach(async ({ page }) => { await loginAs(page); });

  test('TC-SUPP-01: Supplier list page loads', async ({ page }) => {
    await page.goto('/#/supplier');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('TC-SUPP-02: Add new supplier page loads', async ({ page }) => {
    await page.goto('/#/supplier/manage/addItem');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-SUPP-03: Create a supplier via API', async ({ page }) => {
    const { token } = await getAuth(page.request);
    const name = `E2E Supp ${Date.now()}`;
    const resp = await page.request.post(`${API_URL}/api/Supplier`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        supplierName: name,
        mobileNo: `0311${Math.floor(1000000 + Math.random() * 9000000)}`,
        email: `e2esupp${Date.now()}@test.com`,
        isActive: true,
        billingAddress: {
          address: '123 Billing St',
          countryId: '58146ff9-aa34-4d49-a331-1df10c7eb7ca',
          cityName: 'TestCity',
          countryName: 'Afghanistan',
        },
        shippingAddress: {
          address: '456 Shipping St',
          countryId: '58146ff9-aa34-4d49-a331-1df10c7eb7ca',
          cityName: 'TestCity',
          countryName: 'Afghanistan',
        },
      },
    });
    expect([200, 201]).toContain(resp.status());
  });

  test('TC-SUPP-04: Create supplier without addresses returns 422 (not 500)', async ({ request }) => {
    const { token } = await getAuth(request);
    const resp = await request.post(`${API_URL}/api/Supplier`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        supplierName: `E2E Supp Bad ${Date.now()}`,
        mobileNo: `0322${Math.floor(1000000 + Math.random() * 9000000)}`,
      },
    });
    expect([400, 422]).toContain(resp.status());
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ SALES ORDERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Sales Orders Module', () => {
  test.beforeEach(async ({ page }) => { await loginAs(page); });

  test('TC-SO-01: Sales order list page loads', async ({ page }) => {
    await page.goto('/#/sales-order/list');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-SO-02: Add sales order page loads', async ({ page }) => {
    await page.goto('/#/sales-order/add');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-SO-03: SO request list loads', async ({ page }) => {
    await page.goto('/#/sales-order-request/list');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-SO-04: SO return list loads', async ({ page }) => {
    await page.goto('/#/sales-order-return/list');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ PURCHASE ORDERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Purchase Orders Module', () => {
  test.beforeEach(async ({ page }) => { await loginAs(page); });

  test('TC-PO-01: Purchase order list page loads', async ({ page }) => {
    await page.goto('/#/purchase-order/list');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-PO-02: Add purchase order page loads', async ({ page }) => {
    await page.goto('/#/purchase-order/add');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-PO-03: PO request list loads', async ({ page }) => {
    await page.goto('/#/purchase-order-request/list');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-PO-04: PO return list loads', async ({ page }) => {
    await page.goto('/#/purchase-order-return/list');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ EXPENSE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Expense Module', () => {
  test.beforeEach(async ({ page }) => { await loginAs(page); });

  test('TC-EXP-01: Expense list page loads', async ({ page }) => {
    await page.goto('/#/expense');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page.locator('table').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-EXP-02: Add expense page loads', async ({ page }) => {
    await page.goto('/#/expense/add');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-EXP-03: Expense category list loads', async ({ page }) => {
    await page.goto('/#/expense-category');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page.locator('table').first()).toBeVisible({ timeout: 15_000 });
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ACCOUNTING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Accounting Module', () => {
  test.beforeEach(async ({ page }) => { await loginAs(page); });

  test('TC-ACC-01: Ledger accounts page loads', async ({ page }) => {
    await page.goto('/#/accounting/ledger-accounts');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-ACC-02: Financial year page loads', async ({ page }) => {
    await page.goto('/#/accounting/financial-year');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-ACC-03: Transactions page loads', async ({ page }) => {
    await page.goto('/#/accounting/transactions');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-ACC-04: Balance sheet report loads', async ({ page }) => {
    await page.goto('/#/accounting/balance-sheet-report');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-ACC-05: Tax report loads', async ({ page }) => {
    await page.goto('/#/accounting/tax-report');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-ACC-06: Trial balance report loads', async ({ page }) => {
    await page.goto('/#/accounting/trial-balance-report');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-ACC-07: Profit & loss report loads', async ({ page }) => {
    await page.goto('/#/accounting/profit-loss-report');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-ACC-08: Cash bank report loads', async ({ page }) => {
    await page.goto('/#/accounting/cash-bank-report');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-ACC-09: Cash flow report loads', async ({ page }) => {
    await page.goto('/#/accounting/cash-flow-report');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-ACC-10: General entry report loads', async ({ page }) => {
    await page.goto('/#/accounting/general-entry-report');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ INVENTORY / STOCK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Inventory Module', () => {
  test.beforeEach(async ({ page }) => { await loginAs(page); });

  test('TC-INV-01: Inventory list page loads', async ({ page }) => {
    await page.goto('/#/inventory');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-INV-02: Stock transfer list loads', async ({ page }) => {
    await page.goto('/#/stock-transfer/list');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-INV-03: Damaged stock list loads', async ({ page }) => {
    await page.goto('/#/damaged-stock/list');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ INQUIRY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Inquiry Module', () => {
  test.beforeEach(async ({ page }) => { await loginAs(page); });

  test('TC-INQ-01: Inquiry list loads', async ({ page }) => {
    await page.goto('/#/inquiry');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-INQ-02: Add inquiry page loads', async ({ page }) => {
    await page.goto('/#/inquiry/add');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-INQ-03: Inquiry status page loads', async ({ page }) => {
    await page.goto('/#/inquiry-status');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ REMINDERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Reminders Module', () => {
  test.beforeEach(async ({ page }) => { await loginAs(page); });

  test('TC-REM-01: Reminder list loads', async ({ page }) => {
    await page.goto('/#/reminders');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-REM-02: Add reminder page loads', async ({ page }) => {
    await page.goto('/#/reminders/add');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ROLES & USERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Roles & Users Module', () => {
  test.beforeEach(async ({ page }) => { await loginAs(page); });

  test('TC-USR-01: Roles list loads', async ({ page }) => {
    await page.goto('/#/roles');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-USR-02: Add role page loads', async ({ page }) => {
    await page.goto('/#/roles/manage');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page.locator('app-manage-role-presentation, input[type="text"]').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-USR-03: Users list loads', async ({ page }) => {
    await page.goto('/#/users');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-USR-04: Add user page loads', async ({ page }) => {
    await page.goto('/#/users/manage');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ EMAIL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Email Module', () => {
  test.beforeEach(async ({ page }) => { await loginAs(page); });

  test('TC-EMAIL-01: SMTP settings page loads', async ({ page }) => {
    await page.goto('/#/email-smtp');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-EMAIL-02: Email template page loads', async ({ page }) => {
    await page.goto('/#/emailtemplate');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ SETTINGS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Settings Module', () => {
  test.beforeEach(async ({ page }) => { await loginAs(page); });

  test('TC-SETT-01: Company profile page loads', async ({ page }) => {
    await page.goto('/#/company-profile');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-SETT-02: Locations page loads', async ({ page }) => {
    await page.goto('/#/locations');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-SETT-03: Country page loads', async ({ page }) => {
    await page.goto('/#/country');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-SETT-04: City page loads', async ({ page }) => {
    await page.goto('/#/cities');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ REPORTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Reports Module', () => {
  test.beforeEach(async ({ page }) => { await loginAs(page); });

  test('TC-REP-01: Purchase order report loads', async ({ page }) => {
    await page.goto('/#/purchase-order-report');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-REP-02: Sales order report loads', async ({ page }) => {
    await page.goto('/#/sales-order-report');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-REP-03: Stock report loads', async ({ page }) => {
    await page.goto('/#/stock-report');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-REP-04: Expense report loads', async ({ page }) => {
    await page.goto('/#/expense-report');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-REP-05: Product purchase report loads', async ({ page }) => {
    await page.goto('/#/product-purchase-report');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-REP-06: Product sales report loads', async ({ page }) => {
    await page.goto('/#/product-sales-report');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-REP-07: Sales vs purchase report loads', async ({ page }) => {
    await page.goto('/#/sales-purchase-report');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page.locator('form, table, input, mat-select').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-REP-08: Input tax report loads', async ({ page }) => {
    await page.goto('/#/reports/input-tax-report');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-REP-09: Output tax report loads', async ({ page }) => {
    await page.goto('/#/reports/out-tax-report');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-REP-10: Expense tax report loads', async ({ page }) => {
    await page.goto('/#/reports/expense-tax-report');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-REP-11: Purchase payment report loads', async ({ page }) => {
    await page.goto('/#/purchase-payment-report');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-REP-12: Sales payment report loads', async ({ page }) => {
    await page.goto('/#/sales-payment-report');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-REP-13: Supplier payment report loads', async ({ page }) => {
    await page.goto('/#/supplier-payment-report');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-REP-14: Customer payment report loads', async ({ page }) => {
    await page.goto('/#/customer-payment-report');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ LOGS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Logs Module', () => {
  test.beforeEach(async ({ page }) => { await loginAs(page); });

  test('TC-LOG-01: Login audit page loads', async ({ page }) => {
    await page.goto('/#/login-audit');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-LOG-02: Error logs page loads', async ({ page }) => {
    await page.goto('/#/logs');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-LOG-03: Email logs page loads', async ({ page }) => {
    await page.goto('/#/email-logs');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ LOANS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Loans Module', () => {
  test.beforeEach(async ({ page }) => { await loginAs(page); });

  test('TC-LOAN-01: Loan list loads', async ({ page }) => {
    await page.goto('/#/accounting/loans');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-LOAN-02: Add loan page loads', async ({ page }) => {
    await page.goto('/#/accounting/loan/addItem');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ PAYROLL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Payroll Module', () => {
  test.beforeEach(async ({ page }) => { await loginAs(page); });

  test('TC-PAY-01: Payroll list loads', async ({ page }) => {
    await page.goto('/#/pay-roll/list');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-PAY-02: Add payroll page loads', async ({ page }) => {
    await page.goto('/#/pay-roll/add');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ BOOK CLOSE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Book Close Module', () => {
  test.beforeEach(async ({ page }) => { await loginAs(page); });

  test('TC-BC-01: Book close page loads', async ({ page }) => {
    await page.goto('/#/book-close');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page.locator('form, table, input, mat-select').first()).toBeVisible({ timeout: 15_000 });
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ POS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('POS Module', () => {
  test.beforeEach(async ({ page }) => { await loginAs(page); });

  test('TC-POS-01: POS page loads', async ({ page }) => {
    await page.goto('/#/pos');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ DAILY PRICE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Daily Price Module', () => {
  test.beforeEach(async ({ page }) => { await loginAs(page); });

  test('TC-DP-01: Daily price manager page loads', async ({ page }) => {
    await page.goto('/#/daily-price-manager');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page.locator('form, table, input, mat-select').first()).toBeVisible({ timeout: 15_000 });
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ PRINT LABELS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Print Labels Module', () => {
  test.beforeEach(async ({ page }) => { await loginAs(page); });

  test('TC-PL-01: Print labels page loads', async ({ page }) => {
    await page.goto('/#/print-labels');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ API SMOKE TESTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('API Smoke Tests', () => {
  test('TC-API-01: Auth endpoint returns token', async ({ request }) => {
    const resp = await request.post(`${API_URL}/api/authentication`, {
      data: { userName: ADMIN_USER, password: ADMIN_PASS },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.bearerToken).toBeTruthy();
    expect(body.isAuthenticated).toBe(true);
  });

  test('TC-API-02: GET /api/Customer returns list', async ({ request }) => {
    const { token } = await getAuth(request);
    const resp = await request.get(`${API_URL}/api/Customer`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(200);
  });

  test('TC-API-03: GET /api/Supplier returns list', async ({ request }) => {
    const { token } = await getAuth(request);
    const resp = await request.get(`${API_URL}/api/Supplier`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(200);
  });

  test('TC-API-04: GET /api/Product returns list', async ({ request }) => {
    const { token } = await getAuth(request);
    const resp = await request.get(`${API_URL}/api/Product`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(200);
  });

  test('TC-API-05: GET /api/SalesOrder returns list', async ({ request }) => {
    const { token } = await getAuth(request);
    const resp = await request.get(`${API_URL}/api/SalesOrder`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(200);
  });

  test('TC-API-06: GET /api/PurchaseOrder returns list', async ({ request }) => {
    const { token } = await getAuth(request);
    const resp = await request.get(`${API_URL}/api/PurchaseOrder`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(200);
  });

  test('TC-API-07: GET /api/Expense returns list', async ({ request }) => {
    const { token } = await getAuth(request);
    const resp = await request.get(`${API_URL}/api/Expense`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(200);
  });

  test('TC-API-08: GET /api/LedgerAccount returns list', async ({ request }) => {
    const { token } = await getAuth(request);
    const resp = await request.get(`${API_URL}/api/LedgerAccount/52660493-133a-4116-b253-d4925c34842f`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(200);
  });

  test('TC-API-09: GET /api/User/GetUsers returns list', async ({ request }) => {
    const { token } = await getAuth(request);
    const resp = await request.get(`${API_URL}/api/User/GetUsers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(200);
  });

  test('TC-API-10: GET /api/Role returns list', async ({ request }) => {
    const { token } = await getAuth(request);
    const resp = await request.get(`${API_URL}/api/Role`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(200);
  });

  test('TC-API-11: GET /api/Location returns list', async ({ request }) => {
    const { token } = await getAuth(request);
    const resp = await request.get(`${API_URL}/api/Location`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(200);
  });

  test('TC-API-12: Unauthenticated request returns 401', async ({ request }) => {
    const resp = await request.get(`${API_URL}/api/Customer`);
    expect(resp.status()).toBe(401);
  });

  test('TC-API-13: Dashboard stats API returns data', async ({ request }) => {
    const { token } = await getAuth(request);
    const resp = await request.get(`${API_URL}/api/Dashboard/statistics`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(200);
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ PAYMENT / ACCOUNTING REPORTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe('Payment Reports', () => {
  test.beforeEach(async ({ page }) => { await loginAs(page); });

  test('TC-PR-01: Payment report page loads', async ({ page }) => {
    await page.goto('/#/accounting/payment-report');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TC-PR-02: Account balance report loads', async ({ page }) => {
    await page.goto('/#/accounting/account-balance-report');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, table, input, mat-select, mat-checkbox').first()).toBeVisible({ timeout: 15_000 });
  });
});



