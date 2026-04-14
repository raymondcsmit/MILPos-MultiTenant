# Sales Order & POS - Enhanced End-to-End Test Suite

## 1. Module Overview
**Description:** Handles Point of Sale checkout, customer invoicing, FBR integration, and sales returns.

> **Note for Junior Testers:** The test cases below provide concrete, step-by-step instructions. Please read the "Domain Context" to understand *why* we test this feature, and strictly follow the exact values provided in "Test Data".

---

### Test Case: SAL-BB-01 - Process POS Sale
**Test Type:** System Test (Black-Box)

#### 🧠 Domain Context for Junior Testers
The POS (Point of Sale) screen is used by cashiers to quickly ring up customers, accept cash, and print a receipt.

#### 🛠 Preconditions
- Logged in as a Cashier.
- 'Water Bottle' product exists with price $2.00.

#### 📦 Test Data (Concrete Input Values)
- **Product:** `Water Bottle`
- **Quantity:** `3`
- **Tendered Cash:** `$10.00`

#### 🚀 Step-by-Step Execution
1. Navigate to the 'POS' screen.
2. Click on 'Water Bottle' 3 times to add it to the cart (Total $6.00).
3. Click the 'Pay' button.
4. Enter `$10.00` in the Cash Received field.
5. Click 'Submit Sale'.

#### ✅ Expected Results
- A success popup appears showing 'Change Due: $4.00'.
- The cart clears automatically.

#### 🔍 Post-Execution Verification Criteria
- Verify a receipt print dialog is triggered by the browser.

### Test Case: SAL-BB-02 - Sales Return Processing
**Test Type:** System Test (Black-Box)

#### 🧠 Domain Context for Junior Testers
If a customer returns a defective item, the cashier processes a Sales Return. This refunds the customer and puts the item back in inventory.

#### 🛠 Preconditions
- A previous sale exists for 1 'Water Bottle'.

#### 📦 Test Data (Concrete Input Values)
- **Target Sale ID:** The previous sale.
- **Return Item:** `Water Bottle`

#### 🚀 Step-by-Step Execution
1. Navigate to 'Sales -> Sales History'.
2. Click the 'Return' icon next to the sale.
3. Select the 'Water Bottle' checkbox.
4. Click 'Process Return'.

#### ✅ Expected Results
- Return invoice is generated successfully.

#### 🔍 Post-Execution Verification Criteria
- Navigate to Products. Verify the stock of 'Water Bottle' increased by 1.

### Test Case: SAL-IT-01 - Verify Stock decrements on Sale
**Test Type:** Integration Test

#### 🧠 Domain Context for Junior Testers
Selling an item must instantly reduce the physical stock count in the database so we don't accidentally sell out-of-stock items.

#### 🛠 Preconditions
- 'Water Bottle' stock is exactly 50 in the test DB.

#### 📦 Test Data (Concrete Input Values)
- **Sale Payload:** 5 Water Bottles.

#### 🚀 Step-by-Step Execution
1. Run integration test `Verify_Sale_DecrementsStock`.
2. Send POST request to `/api/sales`.

#### ✅ Expected Results
- API returns 200 OK.

#### 🔍 Post-Execution Verification Criteria
- Query `ProductStock` table. Assert the stock is exactly 45.

### Test Case: SAL-IT-02 - Verify FBR API submission
**Test Type:** Integration Test

#### 🧠 Domain Context for Junior Testers
FBR (Federal Board of Revenue) is a government tax system. By law, sales invoices must be digitally transmitted to their servers.

#### 🛠 Preconditions
- FBR HTTP Client is mocked to return a successful 200 OK response with a dummy Invoice Number.

#### 📦 Test Data (Concrete Input Values)
- **Sales Order ID:** `GUID-123`

#### 🚀 Step-by-Step Execution
1. Run `Verify_FBR_Submission_UpdatesStatus`.
2. Dispatch `SubmitFBRInvoiceCommand`.

#### ✅ Expected Results
- The MediatR handler returns a success response.

#### 🔍 Post-Execution Verification Criteria
- Assert that the SalesOrder in the database now has `FBRStatus = Submitted` and an `FBRInvoiceNumber` attached.

### Test Case: SAL-UT-01 - Validate POS Checkout Total
**Test Type:** Unit Test (White-Box)

#### 🧠 Domain Context for Junior Testers
The backend must rigorously recalculate cart totals to prevent malicious users from hacking the frontend to submit a $0 total for expensive items.

#### 🛠 Preconditions
- Cart validation utility is ready.

#### 📦 Test Data (Concrete Input Values)
- **Item:** $100
- **Discount:** 10%
- **Frontend Submitted Total:** $0.00

#### 🚀 Step-by-Step Execution
1. Run `Validate_POSCheckout_RejectsInvalidTotals`.
2. Pass the payload to the calculation engine.

#### ✅ Expected Results
- The backend calculates the true total ($90.00).

#### 🔍 Post-Execution Verification Criteria
- The engine throws a `Total Mismatch Exception` because $90.00 != $0.00.

### Test Case: SAL-UT-02 - Validate FBR Payload mapping
**Test Type:** Unit Test (White-Box)

#### 🧠 Domain Context for Junior Testers
The FBR government API expects data in a very specific JSON structure. We must map our internal `SalesOrder` to their exact structure.

#### 🛠 Preconditions
- A mock `SalesOrder` with taxes and discounts.

#### 📦 Test Data (Concrete Input Values)
- **Tax Amount:** $15.00

#### 🚀 Step-by-Step Execution
1. Run `Validate_FBRMapper_FormatsCorrectly`.
2. Call the mapping profile.

#### ✅ Expected Results
- The resulting DTO has fields named exactly `USIN`, `POSID`, and `TotalTaxAmount`.

#### 🔍 Post-Execution Verification Criteria
- Verify `TotalTaxAmount` is precisely formatted to 2 decimal places as required by FBR.

### Test Case: SAL-WB-01 - Validate Concurrency on Stock during POS Checkout
**Test Type:** Internal Logic Test (White-Box)

#### 🧠 Domain Context for Junior Testers
If two cashiers try to sell the absolute last 'Water Bottle' at the exact same millisecond, only one should succeed. The other should fail.

#### 🛠 Preconditions
- Stock is exactly 1.

#### 📦 Test Data (Concrete Input Values)
- **Concurrent Requests:** 2 simultaneous API calls for 1 item.

#### 🚀 Step-by-Step Execution
1. Run `Validate_DbUpdateConcurrencyException_OnStock`.
2. Use parallel threads to dispatch two checkouts simultaneously.

#### ✅ Expected Results
- Entity Framework throws a `DbUpdateConcurrencyException` for the second thread.

#### 🔍 Post-Execution Verification Criteria
- Assert that stock is 0 (not -1) and exactly 1 sale was recorded.

### Test Case: SAL-WB-02 - Verify MediatR Pipeline Validation
**Test Type:** Internal Logic Test (White-Box)

#### 🧠 Domain Context for Junior Testers
Before a command reaches the business logic, FluentValidation checks it for obvious errors (like empty IDs or negative quantities).

#### 🛠 Preconditions
- Pipeline behaviors are registered.

#### 📦 Test Data (Concrete Input Values)
- **Payload:** Sales Order with Quantity = -5.

#### 🚀 Step-by-Step Execution
1. Run `Validate_Pipeline_CatchesNegativeQuantity`.
2. Dispatch the command.

#### ✅ Expected Results
- The pipeline intercepts the request before it hits the handler.

#### 🔍 Post-Execution Verification Criteria
- Returns a `400 Bad Request` with the message 'Quantity must be greater than zero'.

