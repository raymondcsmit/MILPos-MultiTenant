# Product & Inventory Management - Enhanced End-to-End Test Suite

## 1. Module Overview
**Description:** Handles product catalog, categories, variants, taxes, unit conversions, and stock alerts.

> **Note for Junior Testers:** The test cases below provide concrete, step-by-step instructions. Please read the "Domain Context" to understand *why* we test this feature, and strictly follow the exact values provided in "Test Data".

---

### Test Case: PRD-BB-01 - Create Product via UI
**Test Type:** System Test (Black-Box)

#### 🧠 Domain Context for Junior Testers
Products are the items sold at the POS. A product requires a name, category, price, and initial stock level.

#### 🛠 Preconditions
- Logged in as a user with 'Manage Products' permissions.
- At least one Category exists (e.g., 'Beverages').

#### 📦 Test Data (Concrete Input Values)
- **Name:** `Coca-Cola 500ml`
- **Category:** `Beverages`
- **Price:** `1.50`
- **Initial Stock:** `100`

#### 🚀 Step-by-Step Execution
1. Navigate to 'Products -> Add Product'.
2. Enter `Coca-Cola 500ml` in the Name field.
3. Select `Beverages` from the Category dropdown.
4. Enter `1.50` in the Price field.
5. Enter `100` in the Stock field.
6. Click 'Save'.

#### ✅ Expected Results
- Success notification appears. Browser redirects to Product List.

#### 🔍 Post-Execution Verification Criteria
- 'Coca-Cola 500ml' appears in the top row of the Product data table.

### Test Case: PRD-BB-02 - Export Products to CSV
**Test Type:** System Test (Black-Box)

#### 🧠 Domain Context for Junior Testers
Store managers frequently export their product list to Excel/CSV for external auditing or bulk updating.

#### 🛠 Preconditions
- Logged in as Admin.
- Database contains at least 3 products.

#### 📦 Test Data (Concrete Input Values)
- **Format:** CSV

#### 🚀 Step-by-Step Execution
1. Navigate to the 'Products' list page.
2. Locate the 'Export' button in the top right.
3. Click 'Export' and select 'CSV'.

#### ✅ Expected Results
- The browser begins downloading a file named `Products_[Date].csv`.

#### 🔍 Post-Execution Verification Criteria
- Open the CSV file. Verify it contains columns for Name, Price, and Stock, and that the 3 products are listed.

### Test Case: PRD-IT-01 - Verify AddProductCommand persists all relationships
**Test Type:** Integration Test

#### 🧠 Domain Context for Junior Testers
When a product is saved, it often has related data (like Taxes and Unit measures) that must be saved to separate database tables simultaneously.

#### 🛠 Preconditions
- Integration test database running.

#### 📦 Test Data (Concrete Input Values)
- **Payload:** Product with 2 applied Taxes (e.g., VAT 10%, Sales Tax 5%).

#### 🚀 Step-by-Step Execution
1. Execute integration test `Verify_AddProduct_SavesTaxes`.
2. The test sends a POST to `/api/products`.

#### ✅ Expected Results
- 200 OK response.

#### 🔍 Post-Execution Verification Criteria
- Query `ProductTaxes` table. Assert that exactly 2 records were created linking to the new ProductId.

### Test Case: PRD-IT-02 - Verify StockAlert query
**Test Type:** Integration Test

#### 🧠 Domain Context for Junior Testers
The system warns cashiers when a product is running low on stock so they can reorder it.

#### 🛠 Preconditions
- Product created with an 'Alert Threshold' of 10.

#### 📦 Test Data (Concrete Input Values)
- **Current Stock:** 9

#### 🚀 Step-by-Step Execution
1. Execute test `Verify_StockAlert_ReturnsLowStockItems`.
2. Update the product stock to 9 in the DB.
3. Query the `/api/dashboard/stock-alerts` endpoint.

#### ✅ Expected Results
- The API returns a list containing the product.

#### 🔍 Post-Execution Verification Criteria
- Update stock to 11. Re-query. Ensure the product no longer appears in the alert list.

### Test Case: PRD-UT-01 - Calculate Unit Conversion accurately
**Test Type:** Unit Test (White-Box)

#### 🧠 Domain Context for Junior Testers
If a supplier sells us a 'Box' containing 10 'Pieces', purchasing 2 Boxes means our inventory of Pieces should increase by 20.

#### 🛠 Preconditions
- Unit Conversion rules established in code (Base = Box, Child = Piece, Ratio = 10).

#### 📦 Test Data (Concrete Input Values)
- **Purchased Amount:** 2 Boxes

#### 🚀 Step-by-Step Execution
1. Execute unit test `Calculate_UnitConversion_YieldsCorrectChildQuantity`.
2. Pass the data to the `UnitConversionService`.

#### ✅ Expected Results
- The service mathematically returns `20`.

#### 🔍 Post-Execution Verification Criteria
- Test passes successfully.

### Test Case: PRD-UT-02 - Validate Tax calculation logic
**Test Type:** Unit Test (White-Box)

#### 🧠 Domain Context for Junior Testers
Taxes are added to the base price of a product. If a product costs $100 and has a 10% and 5% tax, the total tax is $15.

#### 🛠 Preconditions
- Tax calculation utility class instantiated.

#### 📦 Test Data (Concrete Input Values)
- **Base Price:** $100
- **Taxes:** 10%, 5%

#### 🚀 Step-by-Step Execution
1. Execute unit test `Calculate_CompoundTaxes_ReturnsCorrectTotal`.
2. Provide the base price and tax array to the method.

#### ✅ Expected Results
- The method returns a calculated Tax Amount of `$15.00` and a Final Price of `$115.00`.

#### 🔍 Post-Execution Verification Criteria
- Verify rounding logic handles fractional pennies (e.g., $15.004 rounds to $15.00).

### Test Case: PRD-WB-01 - Validate Image Upload Storage Logic
**Test Type:** Internal Logic Test (White-Box)

#### 🧠 Domain Context for Junior Testers
When a user uploads a product image, the system must save the physical file to the server's hard drive and only save the file path in the database.

#### 🛠 Preconditions
- `IFileStorageService` is mocked.

#### 📦 Test Data (Concrete Input Values)
- **Base64 String:** `data:image/png;base64,iVBORw0KGgo...`

#### 🚀 Step-by-Step Execution
1. Execute `Validate_FileStorage_SavesToWwwroot`.
2. Pass the base64 string to the handler.

#### ✅ Expected Results
- The service parses the string and writes a `.png` file.

#### 🔍 Post-Execution Verification Criteria
- Verify the returned file path is relative (e.g., `/images/products/guid.png`) and not an absolute server path.

### Test Case: PRD-WB-02 - Verify CQRS Caching Invalidations
**Test Type:** Internal Logic Test (White-Box)

#### 🧠 Domain Context for Junior Testers
To make the app fast, the product list is cached. If a product is edited, the cache must be cleared (invalidated) so users see the updated price.

#### 🛠 Preconditions
- In-Memory cache is active. Product list is currently cached.

#### 📦 Test Data (Concrete Input Values)
- **Update Payload:** Change product price from $10 to $12.

#### 🚀 Step-by-Step Execution
1. Execute `Validate_ProductUpdate_ClearsCache`.
2. Dispatch the `UpdateProductCommand`.

#### ✅ Expected Results
- The MediatR behavior triggers cache invalidation for the `GetProductsQuery` key.

#### 🔍 Post-Execution Verification Criteria
- Dispatch `GetProductsQuery`. Verify it hits the database (not the cache) and returns the new $12 price.

