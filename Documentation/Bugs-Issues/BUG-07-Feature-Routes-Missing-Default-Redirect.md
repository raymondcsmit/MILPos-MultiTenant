# Defect Report: BUG-07 (NAV-01)

**Bug ID:** BUG-07  
**Legacy Reference:** NAV-01 / TC-D05.002  
**Component:** Frontend Routing (`SourceCode/Angular/src/app/**-routes.ts`)  
**Module:** Navigation & Deep Linking  
**Severity:** **MEDIUM**  
**Reproducible:** 100% Deterministic  
**Verified in Live Browser:** Yes (Navigating to `/#/damaged-stock` or `/#/sales-order` renders blank screen)  

---

## 1. Description & Impact

When a user navigates to URLs such as `http://localhost:4200/#/damaged-stock` or `http://localhost:4200/#/sales-order` (either via browser address bar, bookmark, back/forward button, or direct router navigation without `/list`), the application does not display any content. A blank purple background is rendered without any table, error message, or loading indicator.

---

## 2. Root Cause Analysis

In feature routing files such as:
- `damaged-stock-routes.ts`
- `sales-order-routes.ts`
- `stock-transfer-routes.ts`

The route definitions only specify:
```typescript
export const DAMAGED_STOCK_ROUTES: Routes = [
  { path: 'list', component: DamagedStockListComponent },
  { path: 'add', component: ManageDamagedStockComponent }
];
```
Because there is no route configured for `''` (the empty child path):
```typescript
{ path: '', redirectTo: 'list', pathMatch: 'full' }
```
When the parent route `/damaged-stock` loads the child route bundle, no child route matches, leaving the `<router-outlet>` completely empty.

---

## 3. Remediation Plan

Add `{ path: '', redirectTo: 'list', pathMatch: 'full' }` to the route arrays in:
1. `SourceCode/Angular/src/app/damaged-stock/damaged-stock-routes.ts`
2. `SourceCode/Angular/src/app/sales-order/sales-order-routes.ts`
3. `SourceCode/Angular/src/app/stock-transfer/stock-transfer-routes.ts`
4. Inspect other feature route files (`purchase-order-routes.ts`, `customer-routes.ts`, etc.) to ensure consistent redirects.
