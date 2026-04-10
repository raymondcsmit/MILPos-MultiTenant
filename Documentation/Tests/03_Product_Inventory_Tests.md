# Product & Inventory Management - Comprehensive Test Suite

## 1. Test Objectives & Scope
**Module**: Product_Inventory
**Description**: Handles product catalog, categories, variants, taxes, unit conversions, and stock alerts.
**Objective**: Ensure complete end-to-end reliability, data integrity, and UI/UX correctness for all features within this module.

## 2. Test Data Sets
This module requires specific data setups before execution.

### 2.1 Normal Operations
* **Data**: Standard product, valid price, valid stock.
* **Purpose**: Verify standard "happy path" workflows.

### 2.2 Boundary Conditions
* **Data**: Price = 99999999.99, Stock = 0.
* **Purpose**: Verify system stability at the absolute limits of acceptable input.

### 2.3 Error Scenarios & Edge Cases
* **Data**: Negative price, negative stock, missing category. | Product with 50 different tax brackets.
* **Purpose**: Ensure the system gracefully handles invalid states, rejects bad data with standard `ApiResponse`, and maintains ACID properties.

---

## 3. Unit Tests (White-Box)
*Validates internal logic, isolated methods, utility calculations, and specific code paths without database access.*

| Test ID | Objective | Steps | Expected Result | Actual Result | Pass/Fail |
|---------|-----------|-------|-----------------|---------------|-----------|
| PRD-UT-01 | Calculate Unit Conversion accurately | Input base unit 'Box (10)' and child unit 'Piece'. Purchase 2 Boxes. | Inventory increases by 20 Pieces. | [ ] | [ ] |
| PRD-UT-02 | Validate Tax calculation logic | Apply 10% tax and 5% tax to a $100 product | Total tax = $15, Final Price = $115 | [ ] | [ ] |

## 4. Integration Tests (White-Box / Black-Box)
*Verifies interaction between API Controllers, MediatR Handlers, EF Core Repositories, and the underlying Database.*

| Test ID | Objective | Steps | Expected Result | Actual Result | Pass/Fail |
|---------|-----------|-------|-----------------|---------------|-----------|
| PRD-IT-01 | Verify AddProductCommand persists all relationships | Send POST /api/products with Category, Brand, and 2 Taxes | Product, ProductTaxes, and Inventory records created in DB | [ ] | [ ] |
| PRD-IT-02 | Verify StockAlert query | Set product alert threshold to 10, reduce stock to 9, query alerts | Product appears in the Stock Alert dashboard payload | [ ] | [ ] |

## 5. System Tests (Black-Box / End-to-End)
*Examines application flows from a strictly end-user perspective via the Angular Frontend or Postman API calls.*

| Test ID | Objective | Steps | Expected Result | Actual Result | Pass/Fail |
|---------|-----------|-------|-----------------|---------------|-----------|
| PRD-BB-01 | Create Product via UI | Navigate to Products -> Add, fill required fields, select Image, Save | Product listed in data table, image thumbnail visible | [ ] | [ ] |
| PRD-BB-02 | Export Products to CSV | Click Export -> CSV on Product List | Browser downloads Products.csv containing all columns | [ ] | [ ] |

## 6. Internal Logic Tests (White-Box)
*Deep-dive validation of transaction scopes, concurrency, security policies, and architectural constraints.*

| Test ID | Objective | Steps | Expected Result | Actual Result | Pass/Fail |
|---------|-----------|-------|-----------------|---------------|-----------|
| PRD-WB-01 | Validate IFileStorageService logic for Image Uploads | Trace path execution for saving a base64 image string | File saved to /wwwroot/images/products, relative path returned | [ ] | [ ] |
| PRD-WB-02 | Verify CQRS Caching Invalidations | Update a Product, verify if GetProductsQuery cache key is invalidated | Subsequent Get queries hit DB, not stale cache | [ ] | [ ] |
