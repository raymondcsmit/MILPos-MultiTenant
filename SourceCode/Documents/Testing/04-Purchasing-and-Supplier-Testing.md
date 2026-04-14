# 04. Purchasing and Supplier Test Cases

**Module:** Suppliers, Purchase Orders, Receiving Goods, Purchase Payments
**Prerequisites:** Products exist in the system. Logged in as Admin or Manager.

---

## Test Case 4.1: Create Suppliers
**Objective:** Verify that external vendors/suppliers can be added to the system.

**Steps:**
1. Navigate to Purchasing -> Suppliers.
2. Click "Add Supplier".
3. Enter Supplier Name: "Global Tech Distributors".
4. Enter Email: `sales@globaltech.com` and Phone: `+1-555-0101`.
5. Save Supplier.
6. Repeat for "Apple Direct".

**Expected Result:**
- Suppliers are created successfully and appear in the Suppliers list.
- An associated Accounts Payable ledger account is automatically created (if integrated with Accounting).

---

## Test Case 4.2: Create a Purchase Order (PO)
**Objective:** Verify that users can create a Purchase Order to restock inventory.

**Steps:**
1. Navigate to Purchasing -> Purchase Orders.
2. Click "Create PO".
3. Select Supplier: "Global Tech Distributors".
4. Add Item: "Dell XPS 15", Quantity: 10, Unit Cost: 1500.
5. Add Item: "iPhone 15 Pro", Quantity: 20, Unit Cost: 900.
6. Apply Taxes if applicable.
7. Save as "Draft" or "Pending".

**Expected Result:**
- PO is created with a unique PO Number.
- Total amounts are calculated correctly ($15,000 + $18,000 = $33,000 + Tax).
- Inventory levels are NOT yet increased.

---

## Test Case 4.3: Receive Goods against PO
**Objective:** Verify that receiving goods updates inventory correctly.

**Steps:**
1. Open the created Purchase Order.
2. Click "Receive Goods" or "Mark as Received".
3. Confirm quantities (Receive full quantities: 10 Dell, 20 iPhone).
4. Save the receipt.

**Expected Result:**
- PO status changes to "Received" or "Completed".
- Inventory stock for "Dell XPS 15" increases by 10.
- Inventory stock for "iPhone 15 Pro" increases by 20.
- Supplier ledger balance is credited by the total PO amount.

---

## Test Case 4.4: Process Purchase Payment
**Objective:** Verify that payments can be made to the supplier to clear Accounts Payable.

**Steps:**
1. Navigate to Purchasing -> Payments (or Supplier Ledger).
2. Select the PO created in Test Case 4.2.
3. Click "Add Payment".
4. Enter Amount: $15,000 (Partial Payment).
5. Select Payment Method: "Bank Transfer".
6. Save Payment.

**Expected Result:**
- Payment is recorded successfully.
- The PO status changes to "Partially Paid".
- The Supplier's outstanding balance decreases by $15,000.
- The selected Bank Account ledger is debited/credited correctly in Accounting.
