# Sales Order & POS - Comprehensive Test Suite

## 1. Test Objectives & Scope
**Module**: Sales_Order
**Description**: Handles Point of Sale checkout, customer invoicing, FBR integration, and sales returns.
**Objective**: Ensure complete end-to-end reliability, data integrity, and UI/UX correctness for all features within this module.

## 2. Test Data Sets
This module requires specific data setups before execution.

### 2.1 Normal Operations
* **Data**: Standard walk-in customer, 3 products, exact cash.
* **Purpose**: Verify standard "happy path" workflows.

### 2.2 Boundary Conditions
* **Data**: Payment amount exactly equals total; Payment amount is $1,000,000 (check UI rendering).
* **Purpose**: Verify system stability at the absolute limits of acceptable input.

### 2.3 Error Scenarios & Edge Cases
* **Data**: Checkout with out-of-stock item (if backordering disabled). | Barcode scanned rapidly 100 times in 2 seconds.
* **Purpose**: Ensure the system gracefully handles invalid states, rejects bad data with standard `ApiResponse`, and maintains ACID properties.

---

## 3. Unit Tests (White-Box)
*Validates internal logic, isolated methods, utility calculations, and specific code paths without database access.*

| Test ID | Objective | Steps | Expected Result | Actual Result | Pass/Fail |
|---------|-----------|-------|-----------------|---------------|-----------|
| SAL-UT-01 | Validate POS Checkout Total | Add items to cart, apply global discount, apply line-item tax | Final payload total matches UI cart total exactly | [ ] | [ ] |
| SAL-UT-02 | Validate FBR Payload mapping | Map SalesOrder entity to FBRInvoice DTO | All required FBR fields (USIN, POSID) are correctly formatted | [ ] | [ ] |

## 4. Integration Tests (White-Box / Black-Box)
*Verifies interaction between API Controllers, MediatR Handlers, EF Core Repositories, and the underlying Database.*

| Test ID | Objective | Steps | Expected Result | Actual Result | Pass/Fail |
|---------|-----------|-------|-----------------|---------------|-----------|
| SAL-IT-01 | Verify Stock decrements on Sale | Process a POS sale for 5 items | ProductStock table decrements by 5 | [ ] | [ ] |
| SAL-IT-02 | Verify FBR API submission | Mock FBR HTTP client, dispatch SubmitFBRInvoiceCommand | FBR status updates to 'Submitted' or 'Acknowledged' in DB | [ ] | [ ] |

## 5. System Tests (Black-Box / End-to-End)
*Examines application flows from a strictly end-user perspective via the Angular Frontend or Postman API calls.*

| Test ID | Objective | Steps | Expected Result | Actual Result | Pass/Fail |
|---------|-----------|-------|-----------------|---------------|-----------|
| SAL-BB-01 | Process POS Sale | Open POS interface, scan barcode, click Pay, enter cash amount, click Submit | Receipt prints, cart clears, success message | [ ] | [ ] |
| SAL-BB-02 | Sales Return Processing | Navigate to Sales History, click Return, select 1 item, submit | Return invoice generated, stock returned to inventory | [ ] | [ ] |

## 6. Internal Logic Tests (White-Box)
*Deep-dive validation of transaction scopes, concurrency, security policies, and architectural constraints.*

| Test ID | Objective | Steps | Expected Result | Actual Result | Pass/Fail |
|---------|-----------|-------|-----------------|---------------|-----------|
| SAL-WB-01 | Validate Concurrency on Stock during POS Checkout | Simulate two simultaneous checkouts for the last 1 item in stock | One succeeds, the other throws a DbUpdateConcurrencyException or validation error | [ ] | [ ] |
| SAL-WB-02 | Verify MediatR Pipeline Validation | Send empty SalesOrderCommand | FluentValidation pipeline behavior intercepts and returns 400 before hitting the handler | [ ] | [ ] |
