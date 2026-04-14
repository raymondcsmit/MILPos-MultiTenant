# Purchase Order Management - Enhanced End-to-End Test Suite

## 1. Module Overview
**Description:** Handles purchasing from suppliers, stock receiving, and purchase returns.

> **Note for Junior Testers:** The test cases below provide concrete, step-by-step instructions. Please read the "Domain Context" to understand *why* we test this feature, and strictly follow the exact values provided in "Test Data".

---

### Test Case: PUR-BB-01 - Create and Receive PO via UI
**Test Type:** System Test (Black-Box)

#### 🧠 Domain Context for Junior Testers
A Purchase Order (PO) is a request sent to a supplier to buy goods. Once the goods arrive, the PO is marked 'Received' and our inventory increases.

#### 🛠 Preconditions
- Logged in as Admin.
- A supplier named 'Global Traders' exists.
- A product named 'Laptop' exists.

#### 📦 Test Data (Concrete Input Values)
- **Supplier:** `Global Traders`
- **Product:** `Laptop`
- **Quantity:** `50`
- **Status:** `Received`

#### 🚀 Step-by-Step Execution
1. Navigate to 'Purchases -> Add Purchase'.
2. Select `Global Traders` from the supplier dropdown.
3. Add `Laptop` to the item list and set quantity to `50`.
4. Change the PO Status dropdown to `Received`.
5. Click 'Save'.

#### ✅ Expected Results
- Success toast appears. Redirected to Purchase List.

#### 🔍 Post-Execution Verification Criteria
- Navigate to the Products page. Verify the stock for 'Laptop' has increased by 50.

### Test Case: PUR-BB-02 - Purchase Order Payment Partial
**Test Type:** System Test (Black-Box)

#### 🧠 Domain Context for Junior Testers
Businesses often pay suppliers in installments. If a PO costs $1000 and we pay $500, the PO status is 'Partial'.

#### 🛠 Preconditions
- An existing PO for $1000 with status 'Pending Payment'.

#### 📦 Test Data (Concrete Input Values)
- **Payment Amount:** `$500`
- **Payment Method:** `Bank Transfer`

#### 🚀 Step-by-Step Execution
1. Navigate to the Purchase List.
2. Click 'Add Payment' on the $1000 PO.
3. Enter `$500` in the amount field.
4. Select `Bank Transfer`.
5. Click 'Submit'.

#### ✅ Expected Results
- Payment is recorded successfully.

#### 🔍 Post-Execution Verification Criteria
- The PO status changes to 'Partial'. The 'Balance Due' displays as $500.

### Test Case: PUR-IT-01 - Verify Stock increments on Purchase Order completion
**Test Type:** Integration Test

#### 🧠 Domain Context for Junior Testers
Ensures the backend database actually updates the inventory tables when a PO is marked 'Received'.

#### 🛠 Preconditions
- Test database running. 'Laptop' stock is exactly 0.

#### 📦 Test Data (Concrete Input Values)
- **PO Payload:** 10 Laptops, Status = 'Received'.

#### 🚀 Step-by-Step Execution
1. Run integration test `Verify_PO_Received_UpdatesStock`.
2. Send POST request to `/api/purchases`.

#### ✅ Expected Results
- API returns 200 OK.

#### 🔍 Post-Execution Verification Criteria
- Query `ProductStock` table for Laptop. Assert stock is exactly 10.

### Test Case: PUR-IT-02 - Verify Accounting Entry generation
**Test Type:** Integration Test

#### 🧠 Domain Context for Junior Testers
Every financial transaction must balance in accounting. Paying a supplier reduces our Cash and reduces our Accounts Payable debt.

#### 🛠 Preconditions
- Test database running.

#### 📦 Test Data (Concrete Input Values)
- **Payment Payload:** $500 paid to Supplier.

#### 🚀 Step-by-Step Execution
1. Run integration test `Verify_POPayment_CreatesLedgerEntries`.
2. Send POST request to `/api/purchase-payments`.

#### ✅ Expected Results
- API returns 200 OK.

#### 🔍 Post-Execution Verification Criteria
- Query `AccountingEntries` table. Verify two rows were created: Debit Accounts Payable ($500) and Credit Cash ($500).

### Test Case: PUR-UT-01 - Validate Purchase Order Total calculation
**Test Type:** Unit Test (White-Box)

#### 🧠 Domain Context for Junior Testers
Calculates the grand total of a PO by summing line items, applying taxes, and subtracting discounts.

#### 🛠 Preconditions
- Unit test project built.

#### 📦 Test Data (Concrete Input Values)
- **Item 1:** $100 x 2
- **Item 2:** $50 x 1
- **Discount:** $20
- **Tax:** 10%

#### 🚀 Step-by-Step Execution
1. Run `Calculate_POTotal_ReturnsCorrectMath`.
2. Pass the items, discount, and tax to the calculation engine.

#### ✅ Expected Results
- Subtotal = $250. Discounted = $230. Tax = $23. Grand Total = $253.

#### 🔍 Post-Execution Verification Criteria
- Test passes.

### Test Case: PUR-UT-02 - Validate Purchase Return validation
**Test Type:** Unit Test (White-Box)

#### 🧠 Domain Context for Junior Testers
We cannot return more items to a supplier than we originally purchased from them. This prevents inventory corruption.

#### 🛠 Preconditions
- Original PO had 5 Laptops.

#### 📦 Test Data (Concrete Input Values)
- **Return Request:** 10 Laptops

#### 🚀 Step-by-Step Execution
1. Run `Validate_OverReturn_ThrowsException`.
2. Dispatch the `AddPurchaseReturnCommand` with 10 items.

#### ✅ Expected Results
- The validation engine catches the discrepancy and throws a Validation Exception.

#### 🔍 Post-Execution Verification Criteria
- Test passes, proving the guardrail works.

### Test Case: PUR-WB-01 - Validate IDbContextTransaction across multiple Repositories
**Test Type:** Internal Logic Test (White-Box)

#### 🧠 Domain Context for Junior Testers
When receiving a PO, we save the PO, update Inventory, and write Accounting logs. If one fails, ALL must fail (Atomicity) to prevent corrupt data.

#### 🛠 Preconditions
- Mock the `AccountingRepository` to throw a Database Error.

#### 📦 Test Data (Concrete Input Values)
- **Valid PO Payload**

#### 🚀 Step-by-Step Execution
1. Execute `Validate_TransactionRollback_OnPartialFailure`.
2. Dispatch the `AddPurchaseOrderCommand`.

#### ✅ Expected Results
- The PO saves, the Inventory updates, but Accounting throws an error. The `_uow.RollbackTransactionAsync()` is triggered.

#### 🔍 Post-Execution Verification Criteria
- Assert the database is completely empty. Neither the PO nor the Inventory changes were permanently saved.

### Test Case: PUR-WB-02 - Verify Supplier Ledger updating logic
**Test Type:** Internal Logic Test (White-Box)

#### 🧠 Domain Context for Junior Testers
A supplier's ledger tracks how much money we owe them in total across all purchases.

#### 🛠 Preconditions
- Supplier balance is $0.

#### 📦 Test Data (Concrete Input Values)
- **PO Amount:** $1000 (Unpaid)

#### 🚀 Step-by-Step Execution
1. Execute `Validate_SupplierLedger_IncreasesOnPurchase`.
2. Process the PO creation.

#### ✅ Expected Results
- The Supplier's `TotalPayable` field increases by $1000.

#### 🔍 Post-Execution Verification Criteria
- Process a $500 payment. Verify the `TotalPayable` drops to $500.

