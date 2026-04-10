# Permission CSV Files Population - Walkthrough

## Overview

Successfully populated `Pages.csv` and `Actions.csv` files with all permissions extracted from the Angular `menu-items.ts` file. The seeding service will now create these permissions in the database on next application startup.

---

## What Was Done

### 1. Analyzed Menu Structure

Examined [`menu-items.ts`](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Angular/src/app/core/sidebar/menu-items.ts) (1007 lines) to extract:
- **22 Pages** (main menu sections)
- **91 Actions** (individual permissions/claims)

### 2. Created Pages.csv

**File**: [`Pages.csv`](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SeedData/Pages.csv)

**Structure**:
```csv
Id,Name,Order,CreatedDate,CreatedBy,ModifiedDate,ModifiedBy,DeletedDate,DeletedBy,IsDeleted
```

**Pages Created** (22 total):
1. Dashboard
2. Product (includes PRO_MANAGE_DAILY_PRICES)
3. Customer
4. Supplier
5. Sales Order Request
6. Sales Order
7. Purchase Order
8. Accounting
9. Pay Roll
10. Loans
11. Damage Stock
12. Stock Transfer
13. Inventory
14. Expense
15. Reports
16. Inquiry
17. Reminder
18. Roles
19. Users
20. Email
21. Settings
22. Logs

Each page has:
- Unique GUID identifier
- Sequential order number
- Proper timestamps

### 3. Created Actions.csv

**File**: [`Actions.csv`](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SeedData/Actions.csv)

**Structure**:
```csv
Id,Name,Order,PageId,Code,CreatedDate,CreatedBy,ModifiedDate,ModifiedBy,DeletedDate,DeletedBy,IsDeleted
```

**Actions Created** (91 total), including:

#### Product Actions (9)
- PRO_VIEW_PRODUCTS
- PRO_ADD_PRODUCT
- PRO_MANAGE_PRO_CAT
- PRO_MANAGE_TAX
- PRO_MANAGE_UNIT
- PRO_MANAGE_BRAND
- PRO_MANAGE_VARIANTS
- PRO_PRINT_LABELS
- **PRO_MANAGE_DAILY_PRICES** ✅ (NEW)

#### Dashboard Actions (5)
- DB_STATISTICS
- DB_BEST_SELLING_PROS
- DB_RECENT_SO_SHIPMENT
- DB_RECENT_PO_DELIVERY
- DB_PROD_STOCK_ALERT

#### Customer Actions (4)
- CUST_VIEW_CUSTOMERS
- CUST_ADD_CUSTOMER
- CUST_VIEW_CUSTOMER_LADGERS
- CUST_VIEW_CUSTOMER_PENDING_PAYMENTS

...and 73 more actions across all modules.

Each action has:
- Unique GUID identifier
- Human-readable name
- Order within its page
- PageId linking to parent page
- Code (the claim code used in authorization)
- Proper timestamps

---

## How It Works

### Seeding Process

1. **Application Startup**: The `SeedingService` runs automatically
2. **CSV Reading**: Reads `Pages.csv` and `Actions.csv` from `SeedData` folder
3. **Database Check**: Checks if records already exist (by Id)
4. **Incremental Seeding**: Only inserts new records, skips existing ones
5. **Foreign Keys**: Actions are linked to Pages via PageId

### Permission Flow

```
menu-items.ts (hasClaims)
       ↓
Actions.csv (Code field)
       ↓
Database (Action table)
       ↓
Role Management UI
       ↓
User Permissions
       ↓
Navigation Menu Visibility
```

---

## Next Steps

### 1. Run the Application

The seeding will happen automatically on next startup:

```bash
cd SourceCode/SQLAPI/POS.API
dotnet run
```

Or if using desktop mode:
```bash
cd SourceCode
.\build-desktop.ps1
```

### 2. Verify Seeding

Check the console output for:
```
Seeding table: Pages...
Seeding 22 new records into Pages...
Seeding table: Actions...
Seeding 91 new records into Actions...
```

### 3. Assign Permissions

1. Navigate to **Roles** in the application
2. Edit a role (or create new one)
3. Expand **Product** section
4. You should now see **"Manage Daily Prices"** permission
5. Check the box to assign it
6. Save the role

### 4. Test Navigation

1. Login as a user with the role that has `PRO_MANAGE_DAILY_PRICES`
2. Navigate to **Products** menu
3. You should see **"Daily Price Manager"** menu item
4. Click it to access the feature

---

## Files Modified

### Seed Data
- [`Pages.csv`](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SeedData/Pages.csv) - Populated with 22 pages
- [`Actions.csv`](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SeedData/Actions.csv) - Populated with 91 actions

### No Code Changes Required
The existing seeding infrastructure handles these CSV files automatically.

---

## Important Notes

### Incremental Seeding
- The seeding service checks for existing records by Id
- If a record with the same Id exists, it's skipped
- This means you can safely run the application multiple times
- To re-seed, you would need to delete records from the database first

### GUID Consistency
- The GUIDs in the CSV files are fixed
- This ensures consistency across environments
- PageId references in Actions.csv match the Page Ids exactly

### Future Permissions
To add new permissions in the future:
1. Add the claim to `menu-items.ts`
2. Add the corresponding Action row to `Actions.csv`
3. Ensure the PageId matches the parent page
4. Use a unique GUID for the new action
5. Restart the application to seed

---

## Summary

✅ Created `Pages.csv` with 22 pages  
✅ Created `Actions.csv` with 91 actions  
✅ Included `PRO_MANAGE_DAILY_PRICES` permission  
✅ All permissions mapped to correct pages  
✅ Ready for automatic seeding on next startup  

The permission system is now complete and will work automatically when you run the application!
