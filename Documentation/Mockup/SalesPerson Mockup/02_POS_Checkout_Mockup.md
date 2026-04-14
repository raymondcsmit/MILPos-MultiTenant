# 2. POS Checkout Overlay Mockup
**File:** `02_POS_Checkout_Mockup.md`
**Objective:** Visualize where the "Sales Person" attribution lives on the Point of Sale screen before a sale is finalized.

---

### Wireframe Representation

```text
+-----------------------------------------------------------------------------------+
|  [ POS Terminal ]    Search Products [                  🔍 ]      [ Cart (3) ]    |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ Product A ]  [ Product B ]  [ Product C ]   |  CURRENT CART                    |
|  $15.00         $20.00         $5.00           |  ------------------------------- |
|                                                |  1x Product A           $15.00   |
|  [ Product D ]  [ Product E ]  [ Product F ]   |  2x Product C           $10.00   |
|  $10.00         $12.00         $50.00          |                                  |
|                                                |  Subtotal:              $25.00   |
|  [ Product G ]  [ Product H ]  [ Product I ]   |  Tax (10%):              $2.50   |
|  $8.00          $30.00         $11.00          |  Total:                 $27.50   |
|                                                |                                  |
|                                                |  =============================== |
|                                                |  ⭐ ATTRIBUTION (NEW)             |
|                                                |  Select Customer:                |
|                                                |  [ ▼ John Doe (Walk-in)        ] |
|                                                |                                  |
|                                                |  Credit Sale To:                 |
|                                                |  [ ▼ Michael Scott             ] |
|                                                |   (Read-only if Michael is       |
|                                                |    logged in. Editable if Admin) |
|                                                |                                  |
|                                                |  [ CLEAR ]          [ PAY $27.50]|
|                                                |                                  |
+-----------------------------------------------------------------------------------+
```

### UI Behavior & Logic
1. **Credit Sale To Dropdown:**
   - **Scenario 1 (Sales Person logged in):** Automatically populated with the logged-in user. The field is greyed out (disabled) so they cannot attribute the sale to a colleague.
   - **Scenario 2 (Admin logged in):** The field is active. If the Admin selects a Customer (e.g., John Doe), the dropdown auto-fills with John Doe's assigned Sales Rep to save clicks. The Admin can still override it if necessary (e.g., if another rep is covering a shift).
2. **Payload:** When `[ PAY ]` is clicked, `SalesPersonId` is attached to the JSON payload sent to `AddSalesOrderCommand`.