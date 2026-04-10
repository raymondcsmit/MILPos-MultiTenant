# Master Test Data Preparation Plan

This document provides the foundational test data and the **initialization sequence** required to execute the end-to-end test cases for the POS & Inventory Management system, specifically designed to start from a **completely blank database**. 

All subsequent test cases (01 through 08) will reference this data.

## 0. Application Initialization (Blank Database)
When the application starts with a blank database, the `SeedingService` automatically seeds the core tables and the **Master Tenant** (SuperAdmin) based on the `appsettings.json` configuration. 

Before running any tenant-specific test cases, you **must register a new tenant**. You can do this manually via the UI or by running the provided **Postman Collection (`POS-Test.json`)**.

---

## 1. System Roles and Credentials

### Super Admin (System Level - Auto Seeded)
- **Email:** `superadmin@pos.com` (or the `AdminUser` configured in your `appsettings.json` `MasterTenantSettings`)
- **Password:** `Admin@123` (or the `AdminPassword` configured in `appsettings.json`)
- **Role:** SuperAdmin
- **Purpose:** Tenant management, system-wide settings, global licensing.

### Tenant Administrator (Company Level - Needs to be Registered)
- **Email:** `admin@techcorp.com`
- **Password:** `TechCorp@2024`
- **Company Name:** TechCorp POS
- **Subdomain/Tenant ID:** `techcorp`
- **Phone:** `+1-555-0101`
- **Address:** `123 TechCorp Way`
- **Role:** Tenant Admin

*(Note: When a new tenant is registered, the system clones baseline data like default roles, default units, and default locations via the `TenantRegistrationService` and CSV seeding).*

### Store Manager
- **Email:** `manager@techcorp.com`
- **Password:** `Manager@2024`
- **Role:** Manager (Needs to be created manually by the Tenant Admin in User Management)

### Cashier / POS User
- **Email:** `cashier@techcorp.com`
- **Password:** `Cashier@2024`
- **Role:** Cashier (Needs to be created manually by the Tenant Admin in User Management)

---

## 2. Automated Test Data Seeding (via Postman)
To avoid manual data entry for every test cycle, a Postman collection (`POS-Test.json`) is provided in this folder. 

**Execution Order in Postman:**
1. **0. Register Tenant:** Hits `POST /api/Tenants/register` to create `TechCorp POS`.
2. **1. Login (Tenant Admin):** Hits `POST /api/authentication/login` as `admin@techcorp.com` and automatically extracts the JWT token.
3. **Subsequent Requests:** Uses the token to automatically create Brands, Categories, Units of Measurement, Suppliers, and Customers.

---

## 3. Inventory & Product Test Data (Created via Postman/Manual)

### Brands
1. **Brand Name:** Apple
2. **Brand Name:** Samsung
3. **Brand Name:** Dell

### Categories
1. **Category Name:** Electronics
2. **Category Name:** Accessories
3. **Category Name:** Computers

### Units of Measurement (UOM)
1. **Name:** Piece (Pc)
2. **Name:** Box (Bx) - *Conversion: 1 Box = 10 Pieces*

### Products (Must be created manually or via UI automation)
1. **Product 1: iPhone 15 Pro**
   - **Category:** Electronics
   - **Brand:** Apple
   - **Unit:** Piece
   - **Purchase Price:** $900
   - **Sales Price:** $1200
   - **SKU:** `APP-IP15P`
   - **Tax:** 10% Standard Tax

2. **Product 2: Dell XPS 15**
   - **Category:** Computers
   - **Brand:** Dell
   - **Unit:** Piece
   - **Purchase Price:** $1500
   - **Sales Price:** $2000
   - **SKU:** `DEL-XPS15`
   - **Tax:** 10% Standard Tax

---

## 4. Purchasing & Supplier Test Data

### Suppliers
1. **Supplier 1: Global Tech Distributors**
   - **Contact Person:** John Doe
   - **Email:** `sales@globaltech.com`
   - **Phone:** `+1-555-0101`
   - **Address:** 123 Distributor Way, NY

2. **Supplier 2: Apple Direct**
   - **Contact Person:** Jane Smith
   - **Email:** `orders@apple.direct`
   - **Phone:** `+1-555-0202`

---

## 5. Sales & Customer Test Data

### Customers
1. **Customer 1: Walk-in Customer**
   - **Type:** Default POS Customer (Auto-seeded during Tenant Registration)
   - **Email:** N/A
   - **Phone:** N/A

2. **Customer 2: Alice Johnson (B2B/Loyal)**
   - **Email:** `alice@business.com`
   - **Phone:** `+1-555-0303`
   - **Credit Limit:** $5000

---

## 6. Accounting & Expense Test Data

### Chart of Accounts (Ledgers)
- Standard Accounts (Cash in Hand, Accounts Payable, Sales Revenue) are **auto-seeded** when the Tenant registers via the `LedgerAccounts.csv` mapping in `TenantRegistrationService`.

### Expense Categories
1. **Category:** Utilities
2. **Category:** Office Supplies

## Notes for Testers
- **Start with an Empty Database:** Drop and recreate your database. Start the API. The `SeedingService` will run.
- **Run the Postman Script:** Execute `POS-Test.json` to register the tenant and seed baseline data.
- **Context is King:** Always ensure you are logged into the correct **Tenant context** before executing tests (unless executing SuperAdmin global tests).
- Take note of generated IDs (like Purchase Order Number, Sales Order Number) as they will be required in subsequent payment and accounting tests.