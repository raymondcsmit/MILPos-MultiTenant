# 05. Sales and POS Test Cases

**Module:** Customers, POS Terminal, Checkout, Sales Orders, Payments
**Prerequisites:** Products with stock exist. Logged in as Cashier (`cashier@techcorp.com`).

---

## Test Case 5.1: Create Customers
**Objective:** Verify that walk-in and registered customers can be managed.

**Steps:**
1. Navigate to Sales -> Customers.
2. Verify that a default "Walk-in Customer" exists.
3. Click "Add Customer".
4. Enter Name: "Alice Johnson", Email: `alice@business.com`, Phone: `+1-555-0303`.
5. Save Customer.

**Expected Result:**
- Customers are created successfully.
- An Accounts Receivable ledger account is created for Alice Johnson.

---

## Test Case 5.2: POS Terminal - Adding Items to Cart
**Objective:** Verify that the POS interface can add products via search or barcode scanning.

**Steps:**
1. Navigate to the POS Terminal.
2. Select "Walk-in Customer".
3. Search for "iPhone 15 Pro" or scan the SKU `APP-IP15P`.
4. Add the item to the cart.
5. Increase the quantity to 2.
6. Verify the total price calculation (2 * $1200 = $2400 + Tax).

**Expected Result:**
- Items are successfully added to the cart.
- Totals, taxes, and sub-totals recalculate instantly and accurately.

---

## Test Case 5.3: POS Terminal - Checkout and Payment
**Objective:** Verify that a sale can be completed and inventory deducted.

**Steps:**
1. With the cart from Test Case 5.2, click "Checkout" or "Pay".
2. Select Payment Method: "Cash".
3. Enter Amount Tendered: $2500.
4. Confirm the sale.

**Expected Result:**
- Sale is completed and a Receipt/Invoice is generated.
- Change due is displayed correctly ($100 minus tax differences).
- Inventory for "iPhone 15 Pro" is immediately reduced by 2.
- A Sales Order record is created in the backend with status "Completed" and "Paid".
- The Cash in Hand ledger account increases by the final sale amount.

---

## Test Case 5.4: B2B Sales Order (Credit Sale)
**Objective:** Verify that sales can be made on credit to authorized customers.

**Steps:**
1. Navigate to Sales -> Sales Orders (Backend/Admin view, not POS).
2. Click "Create Sales Order".
3. Select Customer: "Alice Johnson".
4. Add Item: "Dell XPS 15", Quantity: 1.
5. Save the order as "Confirmed".
6. Do NOT process a payment. Deliver/Fulfill the items.

**Expected Result:**
- Sales Order is created with status "Unpaid" or "Pending Payment".
- Inventory for "Dell XPS 15" decreases by 1.
- Alice Johnson's Accounts Receivable balance increases by the total amount ($2000 + Tax).

---

## Test Case 5.5: Process Customer Payment
**Objective:** Verify that a customer can pay off their credit balance.

**Steps:**
1. Navigate to Sales -> Payments (or Customer Ledger).
2. Select Alice Johnson and the unpaid Sales Order.
3. Click "Add Payment".
4. Enter Amount: $2000 (or Full Amount).
5. Select Payment Method: "Credit Card" or "Bank Transfer".
6. Save Payment.

**Expected Result:**
- Payment is recorded successfully.
- The Sales Order status changes to "Paid".
- Alice Johnson's outstanding balance decreases to zero.
