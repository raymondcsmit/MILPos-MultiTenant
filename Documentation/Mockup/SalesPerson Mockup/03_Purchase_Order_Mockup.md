# 3. Purchase Order Form Mockup
**File:** `03_Purchase_Order_Mockup.md`
**Objective:** Visualize the addition of "Purchased On Behalf Of" to the Purchase Order creation screen.

---

### Wireframe Representation

```text
+-----------------------------------------------------------------------------------+
|  [< Back]   Create Purchase Order                                       [ Save ]  |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  Supplier & Location                                                              |
|  -------------------------------------------------------------------------------  |
|  Supplier:             [ ▼ Global Distributors Inc.        ]                      |
|  Delivery Location:    [ ▼ North America - East            ]                      |
|                                                                                   |
|  ⭐ Internal Attribution (NEW)                                                     |
|  -------------------------------------------------------------------------------  |
|  Purchased On Behalf Of:                                                          |
|  [ ▼ Michael Scott                                     ]                          |
|  (Dropdown: Select the Sales Person requesting this stock or making this deal)    |
|                                                                                   |
|  Order Details                                                                    |
|  -------------------------------------------------------------------------------  |
|  Order Number:         [ PO-2023-0899                      ] (Auto-generated)     |
|  Status:               [ ▼ Pending Payment                 ]                      |
|  Delivery Date:        [ 10/25/2023 📅                     ]                      |
|                                                                                   |
|  Line Items                                                                       |
|  -------------------------------------------------------------------------------  |
|  Product Name        Qty      Price     Discount     Tax         Total            |
|  [Laptop       ▼]    [10]     [$500.00] [$0.00]      [10%]       $5,500.00 [x]    |
|                                                                                   |
|  + Add Another Item                                                               |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

### UI Behavior & Logic
1. **Purchased On Behalf Of Dropdown:**
   - **Interpretation A (Requisition):** A Sales Person is requesting stock for their territory.
   - **Interpretation B (Direct Buy):** A Sales Person made a deal with a supplier and the business needs to track their procurement performance.
   - Like the POS screen, this dropdown auto-locks to the logged-in user if they are a Sales Person.
   - If an Admin is logged in, they can select any Sales Person to attribute the purchase to them.