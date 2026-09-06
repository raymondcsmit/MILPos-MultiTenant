# 05 — QA Test Suite: Inventory, Stock, Transfers & Damaged Goods

**Module:** Product Catalog, Stock Tracking, Damaged Goods, Inter-Branch Transfers, FEFO Batches & Stock Adjustments  
**Location:** `Documentation/QA/05_QA_INVENTORY_STOCK_TRANSFERS_DAMAGED_TESTS.md`  
**Prerequisites:** Master Golden Data from `00_QA_MASTER_TEST_STRATEGY_AND_DATA_PLAYBOOK.md`  
**Targeted Findings:** BIZ-02, BIZ-03, BIZ-04, INT-05, INT-08, INT-09, INT-10, N-12, N-15, N-30, N-31, N-35, N-36, SEC-01, ACC-07

---

## 1. Module Overview & Quality Objectives
The Inventory and Stock subsystem manages multi-location inventory levels, product catalog definitions, unit conversions, manual stock reconciliations, damaged goods write-offs, inter-branch warehouse transfers, and batch expiration tracking.

### Primary Risks & Failure Modes:
- **Damaged Stock Negative Balance Anomaly (N-36):** `AddDamagedStockCommandHandler` decrements `ProductStock.CurrentStock` without a zero-clamp guard, allowing damaged stock write-offs to drive live inventory balances negative.
- **Product Create & Update NullReferenceExceptions (N-30 / N-31):** Omitting `productVariants` on create (`N-30`) or `productTaxes` on update (`N-31`) causes unhandled `NullReferenceException` 500 errors.
- **Unclaimed Stock Mutation Endpoints (SEC-01 / N-35):** `ProductStockController` endpoints for gain, loss, and bulk-adjust have `[ClaimCheck]` badges commented out, allowing any authenticated user to alter stock.
- **Absolute Stock Correction Backdoor (INT-05):** Direct updates to `CurrentStock` bypassing double-entry journals, causing physical inventory to diverge silently from the general ledger balance.
- **Damaged Stock Crash on Missing Stock Row (INT-08):** Damaged stock creation throws an unhandled NRE if no initial `ProductStock` record exists for that location.
- **Stock Transfer Self-Sale Inflation (BIZ-03):** Booking transfers as internal sale/purchase without elimination accounts, artificially inflating revenue and purchase figures.

---

## 2. Test Cases with Concrete Execution Data

### QA-INV-001 — Product Creation with Auto-Stock Rows & Null Guard Verification (N-30)
- **Aspect / Sub-Module:** Product Catalog Management
- **Test Type:** Functional Happy Path & Robustness (N-30)
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `POS.MediatR/Product/Handlers/AddProductCommandHandler.cs:89`
- **Preconditions:**
  - Authenticated as `admin_alpha` with `PRO_ADD_PRODUCT`.
  - Locations L1 and L2 exist in Tenant Alpha.
- **Concrete Test Data:**
  - Creating a standalone item omitting optional `productVariants` and `productTaxes` lists.
  - **Endpoint:** `POST /api/Product`
  - **Headers:** `Authorization: Bearer {{token_admin_alpha}}`
  - **Request Payload:**
    ```json
    {
      "name": "Steel Water Bottle 750ml",
      "code": "PROD-BOTTLE-01",
      "barcode": "8905001001",
      "skuCode": "SKU-BOTTLE-750",
      "skuName": "Steel Bottle 750ml Blue",
      "description": "Insulated stainless steel water bottle",
      "productUrl": null,
      "unitId": "UNIT-PC-GUID",
      "purchasePrice": 450.00,
      "salesPrice": 750.00,
      "mrp": 800.00,
      "categoryId": "CAT-GENERAL-GUID",
      "brandId": "BRAND-ALPHA-GUID",
      "warehouseId": "L2",
      "alertQuantity": 15,
      "productVariants": null,
      "productTaxes": null
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. Submit the product creation payload with `productVariants = null`.
  2. Inspect response HTTP status code.
  3. Query `Products` table and `ProductStocks` table in the database.
- **Expected Results:**
  - **HTTP Status Code:** `200 OK` (or `201 Created`).
  - **Database Verification:**
    - New row created in `Products` table.
    - System automatically creates **one `ProductStock` row per location** (L1 and L2) with `CurrentStock = 0.0`.
- **Defects & Exceptions Targeted (N-30):**
  - In unfixed code, `request.ProductVariants.Count` dereferenced without null guard causes `500 Internal Server Error (NullReferenceException)`. Test proves null guard is operational.
- **QA Pass/Fail Checklist:**
  - [ ] Product creates successfully without 500 error.
  - [ ] Stock rows automatically initialized for all active locations.

---

### QA-INV-002 — Product Update Omitting Optional Collections (N-31 Fix Verification)
- **Aspect / Sub-Module:** Product Catalog Update
- **Test Type:** Negative / Robustness (N-31)
- **Priority & Severity:** P1 (High)
- **Source & References:** `POS.MediatR/Product/Handlers/UpdateProductCommandHandler.cs`
- **Preconditions:** Product `Steel Water Bottle 750ml` exists.
- **Concrete Test Data:**
  - Updating name and sales price while omitting `productTaxes` array.
  - **Endpoint:** `PUT /api/Product/PROD-BOTTLE-GUID`
  - **Request Payload:**
    ```json
    {
      "id": "PROD-BOTTLE-GUID",
      "name": "Steel Water Bottle 750ml - Revised",
      "salesPrice": 790.00,
      "purchasePrice": 450.00,
      "unitId": "UNIT-PC-GUID",
      "productTaxes": null,
      "productVariants": null
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. Send PUT request with null `productTaxes`.
  2. Verify response status.
- **Expected Results:**
  - HTTP `200 OK`. Name and sales price updated.
  - Defect N-31 guarded (`request.ProductTaxes?.Where(...)` must not throw ArgumentNullException).
- **QA Pass/Fail Checklist:**
  - [ ] Update succeeds without ArgumentNullException.

---

### QA-INV-003 — Damaged Stock Decrement & Negative Inventory Prevention (N-36)
- **Aspect / Sub-Module:** Damaged Goods Write-Off & Stock Integrity
- **Test Type:** Boundary & Defect Verification (N-36)
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `POS.MediatR/DamagedStock/Handlers/AddDamagedStockCommandHandler.cs`
- **Preconditions:**
  - Product `PROD-004` (`Fresh Farm Milk 1L`) stock at L1 = 5 units.
  - Cost price = 90.00.
  - Damaged Stock Expense Account: `5400`, Inventory Asset Account: `1200`.
- **Concrete Test Data:**
  - **Test Case A (Normal Damage within Stock):** Record 2 damaged units.
  - **Test Case B (Abuse Attempt Exceeding Stock):** Record 10 damaged units (exceeds remaining 3 units).
  - **Endpoint:** `POST /api/DamagedStock`
  - **Headers:** `Authorization: Bearer {{token_inventory_clerk}}`
  - **Request Payload (Test Case B):**
    ```json
    {
      "damagedStockNumber": "DMG-2026-0001",
      "locationId": "L1",
      "damagedDate": "2026-09-06T12:00:00Z",
      "remarks": "Carton dropped and crushed in warehouse",
      "damagedStockItems": [
        {
          "productId": "PROD-004-GUID",
          "quantity": 10,
          "unitPrice": 90.00,
          "totalCost": 900.00
        }
      ]
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. Execute Test Case A: Record 2 damaged units.
  2. Verify stock decrements to 3.
  3. Execute Test Case B: Attempt to record 10 damaged units.
  4. Inspect response code and database `ProductStocks.CurrentStock`.
- **Expected Results:**
  - **Test Case A:** HTTP 200 OK.
    - Journal: `Dr 5400 (Damaged Stock Expense) 180.00`, `Cr 1200 (Inventory Asset) 180.00`.
    - Stock at L1 becomes 3.
  - **Test Case B (Hardened Target):** HTTP `422 Unprocessable Entity` (`"Cannot record damage of 10 units. Available stock is only 3."`).
  - **Defect Verification (N-36 Unfixed):** In unfixed code, Test Case B succeeds and drives stock to `-7.0`, corrupting physical and balance-sheet inventory.
- **QA Pass/Fail Checklist:**
  - [ ] Valid damage posts balanced journal and decrements stock.
  - [ ] System strictly blocks stock from driving negative.

---

### QA-INV-004 — Inter-Branch Stock Transfer Lifecycle (L1 Store to L2 Warehouse)
- **Aspect / Sub-Module:** Inter-Branch Stock Transfers & In-Transit Tracking
- **Test Type:** Functional Happy Path
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `POS.MediatR/StockTransfer/Handlers/AddStockTransferCommandHandler.cs`
- **Preconditions:**
  - `PROD-001` stock at L1 = 98 units; at L2 = 690 units.
- **Concrete Test Data:**
  - Transfer 20 units of `PROD-001` from L2 (`Warehouse`) to L1 (`Flagship Store`).
  - **Endpoint:** `POST /api/StockTransfer`
  - **Headers:** `Authorization: Bearer {{token_inventory_clerk}}`
  - **Request Payload:**
    ```json
    {
      "transferDate": "2026-09-06T13:00:00Z",
      "fromLocationId": "L2",
      "toLocationId": "L1",
      "referenceNo": "TR-REF-REQUEST-01",
      "status": 0,
      "notes": "Weekly store replenishment",
      "stockTransferItems": [
        {
          "productId": "PROD-001-GUID",
          "quantity": 20,
          "unitId": "UNIT-PC-GUID"
        }
      ]
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. Submit the stock transfer request.
  2. Inspect response payload (note generated reference number overwrite).
  3. Query `ProductStocks` for both L1 and L2.
- **Expected Results:**
  - **HTTP Status Code:** `200 OK`.
  - **Reference Number Behavior:** Handler overwrites `referenceNo` with system-generated string e.g. `ST-2026-0001`.
  - **Stock Deltas:**
    - Source Location L2: Decreases from 690 to 670 units.
    - Destination Location L1: Increases from 98 to 118 units.
- **QA Pass/Fail Checklist:**
  - [ ] Transfer completes with 200 OK.
  - [ ] Source stock decremented and destination stock incremented.

---

### QA-INV-005 — Stock Transfer Deletion & Stock Reversal Check (N-12 Finding)
- **Aspect / Sub-Module:** Stock Transfer Rollback & Integrity
- **Test Type:** Business Logic & State Rollback
- **Priority & Severity:** P1 (High)
- **Source & References:** `POS.MediatR/StockTransfer/Handlers/DeleteStockTransferCommandHandler.cs`
- **Preconditions:** Transfer of 20 units completed in QA-INV-004.
- **Concrete Test Data:**
  - **Endpoint:** `DELETE /api/StockTransfer/ST-2026-0001-GUID`
  - **Headers:** `Authorization: Bearer {{token_admin_alpha}}`
- **Step-by-Step Execution Procedure:**
  1. Send DELETE request for the stock transfer.
  2. Verify stock levels at L1 and L2.
  3. Verify accounting ledger entries.
- **Expected Results:**
  - HTTP `200 OK`.
  - Stock levels revert: L2 returns to 690; L1 returns to 98.
  - Defect Check (N-12): Handler uses type-flip to reverse stock, but hard-deletes ledger rows without audit trail. QA verifies stock reversibility.
- **QA Pass/Fail Checklist:**
  - [ ] Stock quantities cleanly restored to pre-transfer state.

---

### QA-INV-006 — Missing Authorization on Stock Mutation Endpoints (SEC-01 / N-35)
- **Aspect / Sub-Module:** Stock Adjustment Security Audit
- **Test Type:** Security / Access Control Enforcement
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `POS.API/Controllers/ProductStock/ProductStockController.cs`
- **Preconditions:**
  - User `cashier_l1` has only `POS_POS` claim (ZERO inventory management claims).
- **Concrete Test Data:**
  - **Probe Endpoint:** `POST /api/ProductStock/bulk-adjust`
  - **Headers:** `Authorization: Bearer {{token_cashier_l1}}`
  - **Payload:**
    ```json
    [
      {
        "productId": "PROD-001-GUID",
        "locationId": "L1",
        "currentStock": 9999
      }
    ]
    ```
- **Step-by-Step Execution Procedure:**
  1. Cashier attempts to execute bulk-adjust stock mutation.
  2. Observe HTTP status code.
- **Expected Results (Hardened Target):**
  - **HTTP Status Code:** `403 Forbidden` (`ClaimCheck` requires `INVE_MANAGE_INVENTORY`).
- **Defect Verification (SEC-01 / N-35 Finding):**
  - In unfixed code, `[ClaimCheck]` is commented out on `bulk-adjust`, allowing Cashier to arbitrarily rewrite stock levels to 9999 without accounting logs.
- **QA Pass/Fail Checklist:**
  - [ ] Verify that unprivileged users receive 403 Forbidden.
  - [ ] Log SEC-01 / N-35 if cashier successfully alters stock.

---

### QA-INV-007 — Batch Expiration (FEFO) Alert Lifecycle (BIZ-02 Finding)
- **Aspect / Sub-Module:** First-Expired First-Out (FEFO) & Batch Management
- **Test Type:** Functional & Gap Characterization (BIZ-02)
- **Priority & Severity:** P2 (Medium)
- **Source & References:** `POS.API/Controllers/InventoryBatchController.cs`
- **Preconditions:**
  - Two batches for `PROD-004` (Fresh Milk):
    - Batch A: Expiry Date = `2026-09-08` (2 days left), Stock = 10 units.
    - Batch B: Expiry Date = `2026-09-28` (22 days left), Stock = 20 units.
- **Concrete Test Data:**
  - Query near-expiry alerts endpoint.
- **Step-by-Step Execution Procedure:**
  1. Retrieve batch list for `PROD-004`.
  2. Attempt a POS sale and verify which batch is suggested for deduction.
- **Expected Results:**
  - Batch A is flagged with high-priority expiry warning badge.
  - POS checkout should deduct from Batch A before Batch B (FEFO).
- **QA Pass/Fail Checklist:**
  - [ ] Batch expiry alerts report items expiring within threshold.
  - [ ] Document BIZ-02 gap if POS does not decrement batches automatically.
