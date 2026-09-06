# 04 — QA Test Suite: Purchasing, Suppliers & Supply Chain

**Module:** Purchasing, Purchase Orders (PO), Requisitions, Goods Receipt, PO Returns & Supplier Settlement  
**Location:** `Documentation/QA/04_QA_PURCHASING_SUPPLIERS_SUPPLY_CHAIN_TESTS.md`  
**Prerequisites:** Master Golden Data from `00_QA_MASTER_TEST_STRATEGY_AND_DATA_PLAYBOOK.md`  
**Targeted Findings:** BIZ-01, BIZ-10, INT-01, INT-03, INT-06, INT-07, N-10, N-16, N-20, N-27

---

## 1. Module Overview & Quality Objectives
The Purchasing and Supply Chain subsystem governs the procurement lifecycle from purchase requisitions (POR) to vendor Purchase Orders (PO), warehouse goods receipt (GRN), inventory stock increments, supplier credit/debit adjustments, purchase returns with vendor refunds, and accounts payable (AP) settlements.

### Primary Risks & Failure Modes:
- **PO Return Double-Save Rollback Bug (N-16 / N-20):** Purchase return requesting a refund calling `PaymentService.SaveAsync()` followed by handler `SaveAsync()` returning 0 rows affected, falsely interpreting zero rows as an error and rolling back the entire return transaction with a 500 error.
- **Supplier Duplicate Returns HTTP 422 vs 409 (N-27):** Inconsistent API status code handling and mandatory non-nullable `BillingAddressId` / `ShippingAddressId` causing unhandled SQLite foreign key errors on create.
- **Lack of Physical Goods Receipt (GRN) Separation (BIZ-01):** Stock granted immediately upon PO creation rather than gated on warehouse physical receipt, preventing partial deliveries.
- **Supplier Payment Delete Recheck Double-Subtraction (INT-07):** Deleting a supplier payment record re-evaluates `TotalPaidAmount` by double-subtracting the payment value.
- **Requisition Conversion Loss of Stock Posting (N-10):** Converting a POR to a PO failing to trigger stock and accounting entries due to request flags.

---

## 2. Test Cases with Concrete Execution Data

### QA-PUR-001 — Standard Purchase Order Creation with Stock Increment & AP Posting
- **Aspect / Sub-Module:** Purchase Order Creation Lifecycle
- **Test Type:** Functional Happy Path
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `POS.MediatR/PurchaseOrder/Add/AddPurchaseOrderCommandHandler.cs`, `PurchaseStrategy.cs`
- **Preconditions:**
  - Authenticated as `admin_alpha` with `PO_ADD_PO`.
  - Supplier `SUPP-001` (`National Grain Wholesalers`) exists.
  - Initial stock for `PROD-001` at Location L2 (`Alpha Central Warehouse`) = 500 units.
  - Accounts Payable GL: `2100`, Inventory Asset GL: `1200`, GST Input Tax GL: `1150`.
- **Concrete Test Data:**
  - Quantity: 200 units of `PROD-001` @ cost price 120.00 = 24,000.00.
  - Tax: GST 17% on 24,000.00 = 4,080.00.
  - Total PO Amount = 28,080.00.
  - Payment: Unpaid (Credit purchase on Net 45 terms).
  - **Endpoint:** `POST /api/PurchaseOrder`
  - **Headers:**
    ```http
    Authorization: Bearer {{token_admin_alpha}}
    Content-Type: application/json
    ```
  - **Request Payload:**
    ```json
    {
      "orderNumber": "PO-2026-0001",
      "supplierId": "SUPP-001-GUID",
      "locationId": "L2",
      "deliveryDate": "2026-09-10T00:00:00Z",
      "poCreatedDate": "2026-09-06T00:00:00Z",
      "subTotal": 24000.00,
      "totalTax": 4080.00,
      "totalDiscount": 0.00,
      "totalAmount": 28080.00,
      "totalPaidAmount": 0.00,
      "paymentStatus": 0,
      "status": 0,
      "purchaseOrderItems": [
        {
          "productId": "PROD-001-GUID",
          "unitPrice": 120.00,
          "quantity": 200,
          "taxValue": 4080.00,
          "discountPercentage": 0,
          "unitId": "UNIT-PC-GUID",
          "purchaseOrderItemTaxes": [
            { "taxId": "TAX-GST17-GUID", "taxPercentage": 17.00 }
          ]
        }
      ]
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. Dispatch the PO creation request.
  2. Confirm response HTTP status and assigned order ID.
  3. Query `ProductStocks` for Location L2.
  4. Query `AccountingEntries` and `Transactions` for the PO transaction.
- **Expected Results:**
  - **HTTP Status Code:** `200 OK` (or `201 Created`).
  - **Stock Inventory Verification:**
    - `PROD-001` stock at L2 increases from 500 to 700 units.
  - **Double-Entry Journal Assertions (Balanced Dr = Cr):**
    - `Dr 1200 (Merchandise Inventory Asset)`: 24,000.00
    - `Dr 1150 (GST Input Tax Receivable)`: 4,080.00
    - `Cr 2100 (Accounts Payable - SUPP-001)`: 28,080.00
    - Balance Check: Total Dr (28,080.00) == Total Cr (28,080.00).
- **QA Pass/Fail Checklist:**
  - [ ] PO created with status `0 (Unpaid)`.
  - [ ] Stock increment reflected in L2 warehouse.
  - [ ] AP credit and Inventory debit posted cleanly.

---

### QA-PUR-002 — Purchase Order Return with Refund (N-16 / N-20 Fix Verification)
- **Aspect / Sub-Module:** PO Returns & Supplier Refund Processing
- **Test Type:** Financial & Defect Fix Verification (N-16 / N-20)
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `POS.MediatR/PurchaseOrderReturn/Handlers/UpdatePurchaseOrderReturnCommandHandler.cs`
- **Preconditions:**
  - Purchase Order `PO-2026-0001` created and fully paid (28,080.00).
  - Supplier accepts return of 10 defective units of `PROD-001` and issues an immediate cash refund.
- **Concrete Test Data:**
  - Returned Quantity: 10 units @ 120.00 = 1,200.00 base + 204.00 tax = 1,404.00 total refund.
  - Refund Destination: Cash Drawer Account `1050`.
  - **Endpoint:** `POST /api/PurchaseOrderReturn`
  - **Headers:** `Authorization: Bearer {{token_admin_alpha}}`
  - **Request Payload:**
    ```json
    {
      "purchaseOrderId": "PO-2026-0001-GUID",
      "returnDate": "2026-09-06T14:00:00Z",
      "totalAmount": 1404.00,
      "isRefund": true,
      "refundAccount": "1050",
      "purchaseOrderReturnItems": [
        {
          "productId": "PROD-001-GUID",
          "quantity": 10,
          "unitPrice": 120.00,
          "taxValue": 204.00,
          "unitId": "UNIT-PC-GUID"
        }
      ]
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. Dispatch the purchase order return with `isRefund = true`.
  2. Verify response status code.
  3. Query `ProductStocks` for Location L2.
  4. Query `AccountingEntries` table for refund and inventory reversal.
- **Expected Results (Fixed State N-20):**
  - **HTTP Status Code:** `200 OK`.
  - **Inventory Verification:** `PROD-001` stock at L2 decrements from 700 to 690 units.
  - **Journal Entries:**
    - `Dr 1050 (Cash in Hand)`: 1,404.00
    - `Cr 1200 (Inventory Asset)`: 1,200.00
    - `Cr 1150 (GST Input Tax Receivable)`: 204.00
- **Defect Verification (N-16 Pre-Fix State):**
  - In unfixed code, `PaymentService` saves the UoW, handler's subsequent `SaveAsync()` affects 0 rows, handler reports failure, rolls back, and returns `HTTP 500 Internal Server Error`.
  - QA verifies that no 500 error occurs and refund persists.
- **QA Pass/Fail Checklist:**
  - [ ] PO return succeeds without HTTP 500.
  - [ ] Cash drawer debited and inventory credited.

---

### QA-PUR-003 — Supplier Creation Address Foreign Key Enforcement (N-27 Finding)
- **Aspect / Sub-Module:** Supplier Master Data & Validation
- **Test Type:** Negative / Boundary & FK Integrity
- **Priority & Severity:** P1 (High)
- **Source & References:** `POS.MediatR/Supplier/Handlers/AddSupplierCommandHandler.cs`
- **Preconditions:** Authenticated as `admin_alpha`.
- **Concrete Test Data:**
  - **Payload 1 (Missing Mandatory Address FKs):**
    ```json
    {
      "supplierName": "Raw Material Suppliers Ltd",
      "contactPerson": "Zahid Khan",
      "mobileNo": "03112233445",
      "billingAddressId": null,
      "shippingAddressId": null
    }
    ```
  - **Payload 2 (Valid Address FKs):**
    ```json
    {
      "supplierName": "Raw Material Suppliers Ltd",
      "contactPerson": "Zahid Khan",
      "mobileNo": "03112233445",
      "billingAddress": {
        "address": "Plot 12, Industrial Triangle, Kahuta Road",
        "city": "Rawalpindi",
        "country": "Pakistan"
      }
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. Send Payload 1 omitting address records.
  2. Inspect response status code (ensure it does not crash with raw SQLite Error 19 Foreign Key exception).
  3. Send Payload 2 with nested address.
- **Expected Results:**
  - Payload 1 returns clean validation failure `422 Unprocessable Entity` or `400 Bad Request`.
  - Payload 2 succeeds with `200 OK` creating Supplier and Address rows.
- **QA Pass/Fail Checklist:**
  - [ ] Clean validation returned for missing addresses.
  - [ ] Valid supplier and addresses persist without DB constraint errors.

---

### QA-PUR-004 — Supplier Duplicate Name Validation Status Code Consistency (N-27)
- **Aspect / Sub-Module:** CRUD Status Code Standards
- **Test Type:** Validation & Standards Compliance
- **Priority & Severity:** P2 (Medium)
- **Source & References:** `POS.MediatR/Supplier/Handlers/AddSupplierCommandHandler.cs`
- **Preconditions:** Supplier `National Grain Wholesalers` already exists.
- **Concrete Test Data:**
  - **Endpoint:** `POST /api/Supplier`
  - **Payload:**
    ```json
    {
      "supplierName": "National Grain Wholesalers",
      "contactPerson": "Imran Nazir",
      "mobileNo": "03998877665"
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. Attempt to create supplier with existing name.
  2. Check response status code.
- **Expected Results:**
  - Status code returned is `422 Unprocessable Entity` (or `409 Conflict`).
  - Response body contains clear message: `"Supplier name already exists."`
- **QA Pass/Fail Checklist:**
  - [ ] Status code is 422 or 409 (not 500).
  - [ ] Duplicate rejected.

---

### QA-PUR-005 — Supplier Payment Overpayment Protection (INT-06 Finding)
- **Aspect / Sub-Module:** Accounts Payable & Supplier Settlement
- **Test Type:** Business Rule & Boundary Validation
- **Priority & Severity:** P1 (High)
- **Source & References:** `POS.MediatR/PurchaseOrderPayment/Handlers/AddPurchaseOrderPaymentCommandHandler.cs`
- **Preconditions:**
  - PO `PO-2026-0001` has total balance of 28,080.00.
  - Initial payment made: 20,000.00. Remaining balance = 8,080.00.
- **Concrete Test Data:**
  - Attempting to submit a second payment of `15,000.00` (exceeds remaining 8,080.00 balance).
  - **Endpoint:** `POST /api/PurchaseOrderPayment`
  - **Payload:**
    ```json
    {
      "purchaseOrderId": "PO-2026-0001-GUID",
      "amount": 15000.00,
      "paymentMethod": 1,
      "paymentDate": "2026-09-06T15:00:00Z"
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. Submit overpayment request.
  2. Check response status and error message.
- **Expected Results (Secure Target):**
  - **HTTP Status Code:** `422 Unprocessable Entity` (or `400 Bad Request`).
  - **Message:** `"Payment amount (15,000.00) exceeds outstanding balance (8,080.00)."`
- **Defect Verification (INT-06 Gaps):**
  - In unfixed code, validator compares against `TotalAmount` (28,080.00) instead of remaining balance (8,080.00), improperly accepting the payment and creating an inverted supplier balance.
- **QA Pass/Fail Checklist:**
  - [ ] Overpayment beyond remaining balance is blocked.
  - [ ] Supplier sub-ledger does not flip into negative AP without explicit credit memo.

---

### QA-PUR-006 — Supplier Payment Delete Recheck Logic (INT-07 Finding)
- **Aspect / Sub-Module:** Supplier Payment Deletion & Balance Recalculation
- **Test Type:** Logic Defect Verification (INT-07)
- **Priority & Severity:** P1 (High)
- **Source & References:** `POS.MediatR/PurchaseOrderPayment/Handlers/DeletePurchaseOrderPaymentCommandHandler.cs`
- **Preconditions:**
  - PO `PO-2026-0002` total is 10,000.00.
  - Two payments exist: Payment 1 (6,000.00) and Payment 2 (4,000.00). Total Paid = 10,000.00 (`Status = Paid`).
- **Concrete Test Data:**
  - Delete Payment 2 (4,000.00).
- **Step-by-Step Execution Procedure:**
  1. Send `DELETE /api/PurchaseOrderPayment/PAYMENT-2-GUID`.
  2. Query `PurchaseOrders` table and verify `TotalPaidAmount` and `PaymentStatus`.
- **Expected Results:**
  - `TotalPaidAmount` becomes `6,000.00`.
  - `PaymentStatus` updates to `Partially Paid`.
- **Defect Verification (INT-07):**
  - In unfixed code, recalculation double-subtracts, setting `TotalPaidAmount` to `2,000.00` instead of `6,000.00`.
- **QA Pass/Fail Checklist:**
  - [ ] Recalculated paid amount is exactly 6,000.00.
  - [ ] Double-subtraction defect INT-07 is guarded.
