# Purchase Order Management - Comprehensive Test Suite

## 1. Test Objectives & Scope
**Module**: Purchase_Order
**Description**: Handles purchasing from suppliers, stock receiving, and purchase returns.
**Objective**: Ensure complete end-to-end reliability, data integrity, and UI/UX correctness for all features within this module.

## 2. Test Data Sets
This module requires specific data setups before execution.

### 2.1 Normal Operations
* **Data**: Valid supplier, valid products, standard quantities.
* **Purpose**: Verify standard "happy path" workflows.

### 2.2 Boundary Conditions
* **Data**: PO with 500 line items.
* **Purpose**: Verify system stability at the absolute limits of acceptable input.

### 2.3 Error Scenarios & Edge Cases
* **Data**: Inactive supplier, product not found, zero quantity. | PO received, but product was deleted concurrently.
* **Purpose**: Ensure the system gracefully handles invalid states, rejects bad data with standard `ApiResponse`, and maintains ACID properties.

---

## 3. Unit Tests (White-Box)
*Validates internal logic, isolated methods, utility calculations, and specific code paths without database access.*

| Test ID | Objective | Steps | Expected Result | Actual Result | Pass/Fail |
|---------|-----------|-------|-----------------|---------------|-----------|
| PUR-UT-01 | Validate Purchase Order Total calculation | Add 3 items with different prices, quantities, and discounts | Subtotal, Tax, Discount, and Grand Total match expected mathematical output | [ ] | [ ] |
| PUR-UT-02 | Validate Purchase Return validation | Attempt to return 10 items when only 5 were purchased | Validation Exception thrown | [ ] | [ ] |

## 4. Integration Tests (White-Box / Black-Box)
*Verifies interaction between API Controllers, MediatR Handlers, EF Core Repositories, and the underlying Database.*

| Test ID | Objective | Steps | Expected Result | Actual Result | Pass/Fail |
|---------|-----------|-------|-----------------|---------------|-----------|
| PUR-IT-01 | Verify Stock increments on Purchase Order completion | Create PO for 50 items, mark as 'Received' | ProductStock table increments by 50 for the specific location | [ ] | [ ] |
| PUR-IT-02 | Verify Accounting Entry generation | Complete a Purchase Order with 'Paid' status | Double-entry records created in AccountingEntry table (Debit Inventory, Credit Cash) | [ ] | [ ] |

## 5. System Tests (Black-Box / End-to-End)
*Examines application flows from a strictly end-user perspective via the Angular Frontend or Postman API calls.*

| Test ID | Objective | Steps | Expected Result | Actual Result | Pass/Fail |
|---------|-----------|-------|-----------------|---------------|-----------|
| PUR-BB-01 | Create and Receive PO via UI | Go to Purchases -> Add, select Supplier, add 2 items, submit as Received | PO Status is Received, Inventory updated | [ ] | [ ] |
| PUR-BB-02 | Purchase Order Payment Partial | Create $1000 PO, add $500 payment | PO Status is 'Partial', Balance Due is $500 | [ ] | [ ] |

## 6. Internal Logic Tests (White-Box)
*Deep-dive validation of transaction scopes, concurrency, security policies, and architectural constraints.*

| Test ID | Objective | Steps | Expected Result | Actual Result | Pass/Fail |
|---------|-----------|-------|-----------------|---------------|-----------|
| PUR-WB-01 | Validate IDbContextTransaction across multiple Repositories | Trace AddPurchaseOrderCommandHandler. Verify _purchaseOrderRepo, _inventoryRepo, and _accountingRepo share the same transaction ID | All inserts succeed or all fail together | [ ] | [ ] |
| PUR-WB-02 | Verify Supplier Ledger updating logic | Trace logic updating the supplier's running balance | Supplier balance accurately reflects the new PO debt | [ ] | [ ] |
