# PetalSeed Offline SQLite Database Seeding — Implementation Plan (Pristine Transaction-Free)

## Executive Summary
This updated implementation plan incorporates the user's explicit requirement:
1. **Include all system lookup tables & master reference catalogs**: Countries, Cities, Currencies, Languages, Chart of Accounts (`LedgerAccounts`), Tax rates, Units of Measure (`UnitConversations`), Brands, Product Categories, Expense Categories, System Pages, Actions, Page Helpers, Menu Items, Role Claims, Table Settings, Financial Years, and Agricultural Products (`AG*`).
2. **Clean from all transaction entries**: The generated database will be 100% pristine with **zero (0)** transactional, accounting, journal, sales, purchase, expense, audit, or log records.
3. **Company & Location**: Company Name: `PetalSeed`, Address: `Peshawar`, Store/Location: `Peshawar`, Currency: `PKR`.
4. **Users & Credentials**:
   - `Super Admin`: **Waqar Habib** (`admin@gmail.com`) / `Admin@123`
   - `Admin`: **Waqas** (`waqas@gmail.com`) / `Admin@123`
   - `Employee`: **waqas2** (`waqas2@gmail.com`) / `Admin@123`

---

## Complete Table Ingestion Matrix

### 1. Master & Lookup Tables to Seed (PRESERVED & FULLY POPULATED)

| Category | Database Table | Seed Source | Purpose |
| :--- | :--- | :--- | :--- |
| **Accounting** | `LedgerAccounts` | `LedgerAccounts.csv` | **Full Chart of Accounts** (Assets: 1010, 1020, 1100, 1150, 1200; Liabilities: 2100, 2150; Equity: 5555; Income: 4100, 4200; Expenses: 5100) |
| **Accounting** | `FinancialYears` | `FinancialYears.csv` + Auto | Current calendar/fiscal year (2026, unclosed) |
| **Geographic** | `Countries` | `Countries.csv` | All global countries (230+ records) |
| **Geographic** | `Cities` | `Cities.csv` | Master city reference records |
| **Localization** | `Currencies` | `Currencies.csv` | Global currency codes and symbols (PKR, USD, EUR, etc.) |
| **Localization** | `Languages` | `Languages.csv` | Language catalog (English, Urdu, Arabic, etc.) |
| **Taxation** | `Taxes` | `Taxes.csv` | Master tax rates (GST 17%/18%, Sales Tax, Zero/Exempt) |
| **Inventory Units**| `UnitConversations` | `UnitConversations.csv`| UOM catalog (Kg, Bag, Liter, Piece, Box, Pack, etc.) |
| **Product Catalogs**| `ProductCategories` | `ProductCategories.csv`| Agriculture & Agro-chemical categories |
| **Product Catalogs**| `Brands` | `Brands.csv` | Agricultural fertilizer, seed, and chemical brands |
| **Product Catalogs**| `Products` | `Products.csv` (AG* only) | All agricultural products (fertilizers, seeds, pesticides, tools) |
| **Product Stocks** | `ProductStocks` | Generated | One pristine record per AG product for `Peshawar` location with `CurrentStock = 0.0` |
| **Expenses** | `ExpenseCategories` | `ExpenseCategories.csv`| Utilities, Rent, Office, Operations categories |
| **Communication** | `EmailTemplates` | `EmailTemplates.csv` | System notification email templates |
| **Communication** | `EmailSMTPSettings` | `EmailSMTPSettings.csv`| SMTP delivery configuration |
| **CRM Reference** | `InquiryStatuses` | `InquiryStatuses.csv` | Inquiry CRM stages |
| **CRM Reference** | `InquirySources` | `InquirySources.csv` | Lead/Inquiry source channels |
| **UI & Security** | `Pages` | `Pages.csv` | Navigation pages and module routes |
| **UI & Security** | `Actions` | `Actions.csv` | Feature action claims (`PRO_ADD_PRODUCT`, `SO_ADD_SO`, etc.) |
| **UI & Security** | `Pagehelpers` | `Pagehelpers.csv` | In-app user guidance, tooltips, and manuals |
| **UI & Security** | `RoleClaims` | `RoleClaims.csv` | Permission grants wired to Super Admin, Admin, and Employee roles |
| **UI & Security** | `MenuItems` | `MenuItems.csv` | Dashboard sidebar and navbar menus |
| **UI & Security** | `RoleMenuItems` | `RoleMenuItems.csv` | Menu visibility mappings per role |
| **UI & Tables** | `TableSettings` | `TableSettings.csv` | Default grid columns and display preferences |
| **Organization** | `Tenants` | Generated | `PetalSeed` (`petalseed`, Address: `Peshawar`, Currency: `PKR`) |
| **Organization** | `CompanyProfiles` | Generated | `PetalSeed` store profile, branding, and receipt headers |
| **Organization** | `Locations` | Generated | Primary location: `Peshawar`, Address: `Peshawar` |
| **Organization** | `Licenses` | Generated | Active permanent desktop license |
| **Identity** | `Roles` | `Roles.csv` | `Super Admin`, `Admin`, `Employee` |
| **Identity** | `Users` | Generated via Identity | `admin@gmail.com` (Waqar Habib), `waqas@gmail.com` (Waqas), `waqas2@gmail.com` (waqas2) |
| **Identity** | `UserRoles` | Linked | Role mappings per user |
| **Identity** | `UserLocations` | Linked | All 3 users linked to `Peshawar` location |

---

### 2. Transaction Tables to EXCLUDE / PURGE (GUARANTEED 0 RECORDS)

| Category | Table Name | Target Record Count |
| :--- | :--- | :--- |
| **Sales** | `SalesOrders` | **0** |
| **Sales** | `SalesOrderItems` | **0** |
| **Sales** | `SalesOrderItemTaxes` | **0** |
| **Sales** | `SalesOrderPayments` | **0** |
| **Purchasing** | `PurchaseOrders` | **0** |
| **Purchasing** | `PurchaseOrderItems` | **0** |
| **Purchasing** | `PurchaseOrderItemTaxes` | **0** |
| **Purchasing** | `PurchaseOrderPayments` | **0** |
| **General Ledger** | `Transactions` | **0** |
| **General Ledger** | `TransactionItems` | **0** |
| **General Ledger** | `TransactionItemTaxes` | **0** |
| **Accounting** | `AccountingEntries` | **0** |
| **Accounting** | `PaymentEntries` | **0** |
| **Accounting** | `TaxEntries` | **0** |
| **Stock Activity** | `StockAdjustments` | **0** |
| **Stock Activity** | `DamagedStocks` | **0** |
| **Stock Activity** | `StockTransfers` | **0** |
| **Stock Activity** | `StockTransferItems` | **0** |
| **Expenses** | `Expenses` | **0** |
| **Expenses** | `ExpenseTaxes` | **0** |
| **Customer Ledger** | `CustomerLedgers` | **0** |
| **Loans** | `LoanDetails` | **0** |
| **Loans** | `LoanRepayments` | **0** |
| **Payroll** | `Payrolls` | **0** |
| **Inquiries** | `Inquiries` | **0** |
| **Inquiries** | `InquiryProducts`, `InquiryActivities`, `InquiryAttachments`, `InquiryNotes` | **0** |
| **Reminders** | `Reminders`, `ReminderUsers`, `ReminderNotifications`, `ReminderSchedulers` | **0** |
| **Reminders** | `DailyReminders`, `QuarterlyReminders`, `HalfYearlyReminders` | **0** |
| **Auditing & Logs**| `LoginAudits`, `NLog` | **0** |

---

## Detailed Implementation Steps

### Phase 1: Code Enhancement in Repository & Seed Tool
1. **Update `ITenantRegistrationService` & `TenantRegistrationService`**:
   - Add parameter: `bool includeTransactions = true` to `SeedTenantDataAsync`.
   - When `includeTransactions` is `false`, skip seeding `PurchaseOrders`, `SalesOrders`, `Transactions`, `AccountingEntries`, `Expenses`, `StockAdjustments`, `DamagedStocks`, `StockTransfers`, `LoanDetails`, `Inquiries`, and `Reminders`.
2. **Update `POSDb.SeedTool/Program.cs`**:
   - Configure:
     - `CompanyName = "PetalSeed"`
     - `Subdomain = "petalseed"`
     - `CompanyAddress = "Peshawar"`
     - `LocationName = "Peshawar"`
     - `DefaultPassword = "Admin@123"`
     - `AuditDefaultUserEmail = "admin@gmail.com"`
     - `BusinessType = AppConstants.BusinessType.Agriculture`
   - User creation:
     - User 1: `admin@gmail.com`, Name: `Waqar Habib`, Role: `Super Admin`, `IsSuperAdmin = true`
     - User 2: `waqas@gmail.com`, Name: `Waqas`, Role: `Admin`, `IsSuperAdmin = false`
     - User 3: `waqas2@gmail.com`, Name: `waqas2`, Role: `Employee`, `IsSuperAdmin = false`
     - Link all 3 users to `Peshawar` location.
   - Seed global lookup tables: `Countries`, `Cities`, `Currencies`, `Languages` from CSV.
   - Call `registration.SeedTenantDataAsync(tenant, adminUser, includeTransactions: false)`.
   - Ensure location is renamed to `Peshawar` (Address: `Peshawar`).
   - Create clean `ProductStock` records with `CurrentStock = 0.0m` for all AG products at `Peshawar`.
   - Validate post-seeding assertions:
     - All transaction tables == 0.
     - Lookups & Chart of Accounts count > 0.
     - AG Products count == 20.
     - Active License count == 1.

### Phase 2: Execute Seed Tool & Validate
1. Run `dotnet run --project SourceCode/SQLAPI/POSDb.SeedTool/POSDb.SeedTool.csproj`.
2. Verify output database in `Output/POSDb.db`:
   - Assert all transaction tables have 0 rows.
   - Assert `LedgerAccounts` has full chart of accounts.
   - Assert `CompanyProfiles` has `Title = 'PetalSeed'`.
   - Assert `Locations` has `Name = 'Peshawar'`.
   - Assert `Users` has 3 active accounts.

### Phase 3: Deploy & Repackage Desktop Installer
1. Deploy `POSDb.db` to:
   - `SourceCode/SQLAPI/POS.API/POSDb.db`
   - `SourceCode/SQLAPI/POS.API/bin/Release/net10.0/win-x64/publish/POSDb.db`
   - `SourceCode/SQLAPI/POS.API/wwwroot/App_Data/Templates/POSDb.db`
   - `%AppData%\milpos\POSDb.db`
2. Update `DefaultUser:DefaultUserId` in `appsettings.Desktop.json` to Waqar Habib's UserId (`admin@gmail.com`).
3. Repackage the desktop installer:
   `publish-release.ps1 -NonInteractive -SkipPublish` in `SourceCode/Angular`.

---

## Verification Plan

### Automated Assertions
1. Run automated database verification querying `sqlite_master` and all table row counts:
   - Verify `SalesOrders` = 0, `PurchaseOrders` = 0, `Transactions` = 0, `AccountingEntries` = 0.
   - Verify `LedgerAccounts` > 0 (Chart of accounts present).
   - Verify `Taxes`, `UnitConversations`, `ProductCategories`, `Countries`, `Currencies`, `Languages` > 0.
   - Verify `Products` > 0 (all prefixed with `AG`).
   - Verify `Users` count = 3 with verified BCrypt/Identity password hash for `Admin@123`.
2. Test authentication against API for all 3 users.
