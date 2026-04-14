# 03. Inventory Management Test Cases

**Module:** Brands, Categories, Units, Products, Stock
**Prerequisites:** Logged in as Tenant Admin (`admin@techcorp.com`) or Manager (`manager@techcorp.com`).

---

## Test Case 3.1: Create Brands
**Objective:** Verify that users can add new product brands.

**Steps:**
1. Navigate to Inventory -> Brands.
2. Click "Add Brand".
3. Enter Brand Name: "Apple" and save.
4. Repeat for "Samsung" and "Dell".

**Expected Result:**
- Brands are saved successfully.
- They appear in the Brands list for the current tenant.

---

## Test Case 3.2: Create Categories
**Objective:** Verify that users can add product categories.

**Steps:**
1. Navigate to Inventory -> Categories.
2. Click "Add Category".
3. Enter Category Name: "Electronics" and save.
4. Repeat for "Accessories" and "Computers".

**Expected Result:**
- Categories are saved successfully.
- They appear in the Categories list.

---

## Test Case 3.3: Configure Units of Measurement (UOM)
**Objective:** Ensure base and derivative units can be established.

**Steps:**
1. Navigate to Settings/Inventory -> Units.
2. Click "Add Unit".
3. Enter Unit Name: "Piece", Short Name: "Pc", and save as Base Unit.
4. Enter Unit Name: "Box", Short Name: "Bx". Set Base Unit to "Piece" and Conversion Rate to "10".
5. Save the Unit.

**Expected Result:**
- Both units are created.
- The system correctly links "Box" to "Piece" with a 10x multiplier.

---

## Test Case 3.4: Create Products (Single and Variable)
**Objective:** Verify that products can be added to the catalog with correct pricing, SKU, and taxes.

**Steps:**
1. Navigate to Inventory -> Products.
2. Click "Add Product".
3. Enter Product Name: "iPhone 15 Pro".
4. Select Category: "Electronics" and Brand: "Apple".
5. Select Unit: "Piece".
6. Enter Purchase Price: 900, Sales Price: 1200, Tax: 10%.
7. Enter SKU: `APP-IP15P`.
8. Save Product.
9. Repeat for "Dell XPS 15" (`DEL-XPS15`, Purchase: 1500, Sales: 2000, Tax: 10%).

**Expected Result:**
- Products are successfully saved.
- They appear in the product grid with zero initial stock (unless opening stock was specified).
- Barcodes/SKUs are unique within the tenant.

---

## Test Case 3.5: Stock Transfer / Adjustment
**Objective:** Verify that stock levels can be manually adjusted or transferred between stores/warehouses.

**Steps:**
1. Navigate to Inventory -> Stock Adjustment (or Transfer).
2. Select the Product "iPhone 15 Pro".
3. Enter Adjustment Type: "Add" (or "Opening Stock").
4. Enter Quantity: 50.
5. Save the adjustment.

**Expected Result:**
- The inventory level for "iPhone 15 Pro" increases to 50.
- A stock movement ledger entry is created.

---

## Test Case 3.6: Damaged Stock Processing
**Objective:** Verify that damaged goods can be removed from sellable inventory.

**Steps:**
1. Navigate to Inventory -> Damaged Stock.
2. Select Product "iPhone 15 Pro".
3. Enter Quantity: 2.
4. Add a reason: "Screen cracked in warehouse".
5. Submit the form.

**Expected Result:**
- The sellable stock of "iPhone 15 Pro" is reduced by 2 (new total: 48).
- The damaged stock register records the 2 items with the specified reason.
