# 1. Customer Form Mockup
**File:** `01_Customer_Form_Mockup.md`
**Objective:** Visualize the addition of "Region" and "Sales Person" fields to the existing Customer creation/edit screen.

---

### Wireframe Representation

```text
+-----------------------------------------------------------------------------------+
|  [< Back]   Create New Customer                                         [ Save ]  |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  Basic Information                                                                |
|  -------------------------------------------------------------------------------  |
|  Customer Name:        [ John Doe                          ]                      |
|  Email Address:        [ john.doe@example.com              ]                      |
|  Phone Number:         [ +1 555-0192                       ]                      |
|  Tax/VAT Number:       [ 123456789                         ]                      |
|                                                                                   |
|  Billing & Shipping                                                               |
|  -------------------------------------------------------------------------------  |
|  Billing Address:      [ 123 Main St, New York, NY         ]                      |
|  Shipping Address:     [ Same as Billing                   ]                      |
|                                                                                   |
|  ⭐ Territory & Assignment (NEW)                                                   |
|  -------------------------------------------------------------------------------  |
|  Dedicated Region:     [ ▼ North America - East            ]                      |
|                         (Dropdown populated from `Locations` table)               |
|                                                                                   |
|  Assigned Sales Rep:   [ ▼ Michael Scott                   ]                      |
|                         (Dropdown populated from `Users` where Role=SalesPerson)  |
|                                                                                   |
|  [!] Note: If logged in as 'Michael Scott', the "Assigned Sales Rep" dropdown     |
|            is automatically locked (disabled) to his own name.                    |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

### UI Behavior & Logic
1. **Region Dropdown:** Populates from the `Location` table. If a Sales Person is logged in, this dropdown is filtered to ONLY show locations mapped to their `UserLocations` profile.
2. **Assigned Sales Rep Dropdown:** 
   - **Admin/Manager View:** Fully selectable. They can assign any Sales Person.
   - **Sales Person View:** Disabled/Read-only. Auto-populated with the logged-in user's name to prevent spoofing.
3. **Auto-Fill UX:** If an Admin selects "North America - East", the Sales Rep dropdown could optionally filter to only show Reps active in that region.