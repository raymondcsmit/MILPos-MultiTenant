# 03 — QA Test Suite: POS Terminal, Checkout & Sales Orders

**Module:** Point of Sale (POS), Sales Orders, Pricing Engine, Tender Settlement & Sales Returns (The Money Path)  
**Location:** `Documentation/QA/03_QA_POS_TERMINAL_AND_SALES_ORDERS_TESTS.md`  
**Prerequisites:** Master Golden Data from `00_QA_MASTER_TEST_STRATEGY_AND_DATA_PLAYBOOK.md`  
**Targeted Findings:** INT-01, INT-02, INT-03, INT-04, INT-06, INT-11, N-04, N-05, N-13, N-14, N-22, N-23, N-24, UX-02, ACC-03, ACC-04, ACC-06

---

## 1. Module Overview & Quality Objectives
The Point of Sale (POS) and Sales Order subsystem is the primary revenue-generating core of MILPOS. It encompasses barcode scanning, cart management, dynamic pricing, multiple tax applications, discount rules, tender settlements, invoice generation, inventory decrements, and automatic journal postings to the general ledger.

### Primary Risks & Failure Modes:
- **Over-Return Vulnerability (N-04):** Server-side sales return accepts quantities greater than originally sold, creating negative balances and phantom inventory.
- **Payment Delete Double-Subtraction (N-05):** Deleting a payment record from an overpaid sales order erroneously double-subtracts the deleted amount.
- **Unit Price Operator Precedence Bug (UX-02):** In the Angular POS client, `product?.salesPrice ?? 0 * unitValue` binds `??` before arithmetic, resulting in units like Dozen or Half failing to alter product price.
- **Order Number Concurrency Collision (INT-11 / N-24):** High-volume simultaneous POS checkouts attempting to generate the next sequential order number crash with unhandled 500 errors instead of clean retry or 409 conflict.
- **Delivery Status Stock Deduction Timing (N-22):** Back-office sales orders deduct inventory at creation even when `DeliveryStatus = Pending`.

---

## 2. Test Cases with Concrete Execution Data

### QA-POS-001 — Standard POS Cash Checkout with Multi-Tax Non-Compounded Calculation
- **Aspect / Sub-Module:** POS Checkout & Math Verification
- **Test Type:** Functional Happy Path
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `Angular/src/app/pos/pos.component.ts`, `quantities-unitprice-tax.pipe.ts`, `POS.MediatR/SalesOrder/Add/AddSalesOrderCommandHandler.cs`
- **Preconditions:**
  - Cashier `cashier_l1` logged in at Location L1 (`Alpha Flagship Store`).
  - Stock levels: `PROD-001` has 100 units; `PROD-003` (Multi-tax 22%) has 40 units.
  - Cash Drawer GL Account: `1050`.
- **Concrete Test Data:**
  - Cart Item 1: 2 × `PROD-001` (`Super Basmati Rice 1kg`) @ 180.00 = 360.00 base. Tax: GST 17% (61.20). Line Total = 421.20.
  - Cart Item 2: 1 × `PROD-003` (`Organic Green Tea 100g`) @ 320.00 = 320.00 base. Taxes: GST 17% (54.40) + PST 5% (16.00) = 70.40. Line Total = 390.40.
  - Order Calculations:
    - Subtotal = 360.00 + 320.00 = 680.00
    - Total Tax = 61.20 + 70.40 = 131.60
    - Computed Gross = 811.60
    - Floored TotalAmount = 811.00
    - TotalRoundOff = 0.60
    - Tendered Cash = 1,000.00
    - Change Due = 189.00
  - **Endpoint:** `POST /api/SalesOrder`
  - **Headers:**
    ```http
    Authorization: Bearer {{token_cashier_l1}}
    Content-Type: application/json
    ```
  - **Request Payload:**
    ```json
    {
      "orderNumber": "SO-2026-0001",
      "orderDate": "2026-09-06T10:30:00Z",
      "deliveryDate": "2026-09-06T10:30:00Z",
      "deliveryStatus": 0,
      "customerId": "CUST-WALK-GUID",
      "locationId": "L1",
      "subTotal": 680.00,
      "totalTax": 131.60,
      "totalDiscount": 0.00,
      "totalRoundOff": 0.60,
      "totalAmount": 811.00,
      "totalPaidAmount": 811.00,
      "paymentStatus": 1,
      "salesOrderItems": [
        {
          "productId": "PROD-001-GUID",
          "unitPrice": 180.00,
          "quantity": 2,
          "taxValue": 61.20,
          "discountPercentage": 0,
          "unitId": "UNIT-PC-GUID",
          "salesOrderItemTaxes": [
            { "taxId": "TAX-GST17-GUID", "taxPercentage": 17.00 }
          ]
        },
        {
          "productId": "PROD-003-GUID",
          "unitPrice": 320.00,
          "quantity": 1,
          "taxValue": 70.40,
          "discountPercentage": 0,
          "unitId": "UNIT-PC-GUID",
          "salesOrderItemTaxes": [
            { "taxId": "TAX-GST17-GUID", "taxPercentage": 17.00 },
            { "taxId": "TAX-PST05-GUID", "taxPercentage": 5.00 }
          ]
        }
      ],
      "salesOrderPayments": [
        {
          "paymentMethod": 0,
          "amount": 811.00,
          "paidTransactionId": null
        }
      ]
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. Submit the sales order checkout request.
  2. Validate response HTTP status code and body.
  3. Query `ProductStocks` table to verify stock reduction.
  4. Query `AccountingEntries` and `Transactions` table to verify journal balancing.
- **Expected Results:**
  - **HTTP Status:** `200 OK` (returns created `SalesOrderDto` with `status: "Paid"`).
  - **Inventory Verification:**
    - `PROD-001` stock at L1 decreased from 100 to 98.
    - `PROD-003` stock at L1 decreased from 40 to 39.
  - **Double-Entry Journal Assertions (Balanced Dr = Cr):**
    - `Dr 1050 (Cash in Hand)`: 811.00
    - `Dr 5900 (Cash Round-Off Expense)`: 0.60
    - `Cr 4100 (Sales Revenue)`: 680.00
    - `Cr 2150-01 (GST Output Tax 17%)`: 115.60 (61.20 + 54.40)
    - `Cr 2150-02 (PST Output Tax 5%)`: 16.00
    - Total Debit (811.60) == Total Credit (811.60).
    - `Dr 5100 (COGS)`: 440.00 (2 × 120.00 + 1 × 200.00)
    - `Cr 1200 (Inventory Asset)`: 440.00
- **Defects & Exceptions Targeted:**
  - Multi-tax calculation must NEVER compound (PST 5% must be applied to 320.00, NOT to 374.40).
  - Accounting journal must be strictly balanced down to the exact cent.
- **QA Pass/Fail Checklist:**
  - [ ] HTTP 200 returned with correct totals.
  - [ ] Stock quantities deducted accurately.
  - [ ] Double-entry debits equal credits.

---

### QA-POS-002 — Unit Price Arithmetic Operator Bug (UX-02 Finding)
- **Aspect / Sub-Module:** POS Client Pricing Pipe & Unit Conversion
- **Test Type:** Functional & Defect Characterization (UX-02)
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `Angular/src/app/pos/pos.component.ts:280-286`
- **Preconditions:**
  - Product `PROD-005` (`Premium Ballpoint Pen`) has `salesPrice = 30.00`.
  - Units defined: `PC` (Base), `DZ` (Dozen, operator `*`, value 12), `BOX-24` (operator `*`, value 24).
- **Concrete Test Data:**
  - Add `PROD-005` to cart. Initial Unit = `PC`, UnitPrice = 30.00.
  - Change Unit dropdown to `DZ`.
- **Step-by-Step Execution Procedure:**
  1. On the POS screen, select unit `DZ` for `PROD-005`.
  2. Observe the unitPrice in the cart table.
- **Expected Results (Correct Business Logic):**
  - Unit Price recalculates to `30.00 * 12 = 360.00`.
- **Defect Verification (UX-02 Bug):**
  - Current Angular code: `product?.salesPrice ?? 0 * 12`.
  - Because `salesPrice` is defined (30.00), the null-coalescing operator short-circuits, leaving price at `30.00`!
  - Customer gets 12 pens for the price of 1 pen.
- **QA Pass/Fail Checklist:**
  - [ ] Verify if unit price multiplies correctly to 360.00.
  - [ ] Flag critical bug UX-02 if unit price remains 30.00.

---

### QA-POS-003 — Over-Return Vulnerability Guard (N-04 Finding)
- **Aspect / Sub-Module:** Sales Returns & Credit Note Engine
- **Test Type:** Negative / Boundary & Vulnerability Probe
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `POS.MediatR/SalesOrder/Update/UpdateSalesOrderCommandReturnHandler.cs`
- **Preconditions:**
  - Completed Sales Order `SO-2026-0001` exists with 2 units of `PROD-001` sold.
- **Concrete Test Data:**
  - **Endpoint:** `POST /api/SalesOrder/return`
  - **Headers:** `Authorization: Bearer {{token_cashier_l1}}`
  - **Malicious Payload (Returning 50 units instead of max 2):**
    ```json
    {
      "salesOrderId": "SO-2026-0001-GUID",
      "returnDate": "2026-09-06T11:00:00Z",
      "salesOrderReturnItems": [
        {
          "salesOrderItemId": "SO-ITEM-001-GUID",
          "productId": "PROD-001-GUID",
          "quantity": 50,
          "unitPrice": 180.00,
          "taxValue": 1530.00,
          "discountPercentage": 0
        }
      ]
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. Dispatch the return payload with `quantity = 50`.
  2. Observe backend response status code.
  3. Query `ProductStocks` and `SalesOrderReturns` tables.
- **Expected Results (Hardened Target):**
  - **HTTP Status:** `422 Unprocessable Entity` (or `400 Bad Request`)
  - **Error Message:** `"Return quantity (50) exceeds original sold quantity (2)."`
  - Zero stock added back.
- **Defect Verification (N-04 Pre-Fix State):**
  - If backend returns HTTP 200, N-04 is confirmed: the server accepts over-returns, creates a massive negative refund, and corrupts inventory.
- **QA Pass/Fail Checklist:**
  - [ ] Over-return is strictly blocked on backend.
  - [ ] Flag defect N-04 if return succeeds.

---

### QA-POS-004 — Payment Delete Double-Subtraction Bug (N-05 Finding)
- **Aspect / Sub-Module:** Sales Order Payment Lifecycle
- **Test Type:** Edge Case & Logic Defect (N-05)
- **Priority & Severity:** P1 (High)
- **Source & References:** `POS.MediatR/SalesOrderPayment/Handler/DeleteSalesOrderPaymentCommandHandler.cs`
- **Preconditions:**
  - Order `SO-2026-0002` total is 500.00.
  - Due to an overpayment or multi-payment, two payments exist: Payment A (400.00) and Payment B (200.00). Total Paid = 600.00 (`PaymentStatus = Paid`).
- **Concrete Test Data:**
  - **Endpoint:** `DELETE /api/SalesOrderPayment/PAYMENT-B-GUID`
  - **Header:** `Authorization: Bearer {{token_admin_alpha}}`
- **Step-by-Step Execution Procedure:**
  1. Delete Payment B (200.00).
  2. Inspect the recalculated `TotalPaidAmount` and `PaymentStatus` on the `SalesOrder` record.
- **Expected Results (Correct Behavior):**
  - `TotalPaidAmount = 600.00 - 200.00 = 400.00`.
  - `PaymentStatus` transitions to `Partially Paid`.
- **Defect Verification (N-05 Bug):**
  - In unfixed code, deleting 200.00 on an overpaid order subtracts the amount twice, setting `TotalPaidAmount` to `200.00` instead of `400.00`.
- **QA Pass/Fail Checklist:**
  - [ ] Verify `TotalPaidAmount` equals exactly remaining payments sum.
  - [ ] Flag defect N-05 if double-subtraction occurs.

---

### QA-POS-005 — Multi-Tender Split Payment Checkout
- **Aspect / Sub-Module:** Split Payment Handling (Cash + Card)
- **Test Type:** Functional Happy Path
- **Priority & Severity:** P1 (High)
- **Source & References:** `POS.API/Controllers/SalesOrder/SalesOrderController.cs`
- **Preconditions:**
  - Cashier `cashier_l1` checking out customer with total bill of 1,000.00.
- **Concrete Test Data:**
  - Total Order Amount: 1,000.00.
  - Split: 400.00 Cash (`1050`), 600.00 Credit Card (`1060`).
  - **Endpoint:** `POST /api/SalesOrder`
  - **Payments Section:**
    ```json
    "salesOrderPayments": [
      {
        "paymentMethod": 0,
        "amount": 400.00,
        "reference": "Cash Tendered"
      },
      {
        "paymentMethod": 1,
        "amount": 600.00,
        "reference": "VISA-AUTH-987123"
      }
    ]
    ```
- **Step-by-Step Execution Procedure:**
  1. Submit split payment order.
  2. Check `PaymentStatus` and ledger entries.
- **Expected Results:**
  - HTTP `200 OK`. `PaymentStatus = 1 (Paid)`.
  - Two payment records created in `SalesOrderPayments`.
  - Accounting journal posts:
    - `Dr 1050 (Cash)`: 400.00
    - `Dr 1060 (Bank)`: 600.00
    - `Cr 4100 (Sales Revenue)`: 1,000.00
- **QA Pass/Fail Checklist:**
  - [ ] Split payment processes without balance discrepancy.
  - [ ] Both asset accounts debited accurately.

---

### QA-POS-006 — High-Concurrency Order Number Collision Test (INT-11 / N-24)
- **Aspect / Sub-Module:** Concurrency & Unique Order Numbering
- **Test Type:** Concurrency / Race Condition
- **Priority & Severity:** P1 (High)
- **Source & References:** `GetNewSalesOrderNumberQueryHandler.cs`, `AddSalesOrderCommandHandler.cs`
- **Preconditions:** Two cashier terminals submitting checkouts simultaneously.
- **Concrete Test Data:**
  - Both terminals fetch current order number counter and construct payloads using the same `orderNumber = "SO-2026-9999"`.
- **Step-by-Step Execution Procedure:**
  1. Launch 2 parallel HTTP threads dispatching `POST /api/SalesOrder` with identical `orderNumber`.
  2. Observe the status codes returned to each thread.
- **Expected Results:**
  - Exactly one thread succeeds with `HTTP 200 OK`.
  - The second thread receives `HTTP 409 Conflict` (or automated retry succeeds with `SO-2026-10000`).
  - Defect Check (N-24): If loser crashes with `HTTP 500 Internal Server Error` due to swallowed unique constraint exception, log defect N-24.
- **QA Pass/Fail Checklist:**
  - [ ] Exactly one winner persists; zero duplicate order numbers in DB.
  - [ ] Loser handles conflict gracefully without unhandled 500.

---

### QA-POS-007 — Back-Office Sales Order Stock Deduction Timing (N-22 Finding)
- **Aspect / Sub-Module:** Non-POS Order Fulfillment Lifecycle
- **Test Type:** Business Logic & State Tracking
- **Priority & Severity:** P1 (High)
- **Source & References:** `AddSalesOrderCommandHandler.cs`
- **Preconditions:** Product `PROD-002` stock is 50 at L1.
- **Concrete Test Data:**
  - Back-office sales order created with `deliveryStatus = 1 (PENDING)`.
  - Quantity = 10.
- **Step-by-Step Execution Procedure:**
  1. Post sales order with `deliveryStatus = 1`.
  2. Immediately check `ProductStocks.CurrentStock`.
- **Expected Results (Characterization of Current Behavior N-22):**
  - Current code deducts stock at creation regardless of `deliveryStatus` (Stock becomes 40).
  - Target Future Behavior: Stock should be reserved, and only deducted from `CurrentStock` when marked `DELIVERED`.
- **QA Pass/Fail Checklist:**
  - [ ] Verify whether pending orders decrement live stock.
  - [ ] Confirm alignment with documented characterization N-22.
