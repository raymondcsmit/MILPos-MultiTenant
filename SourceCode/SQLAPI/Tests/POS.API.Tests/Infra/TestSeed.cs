using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using POS.Data;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Domain;
using ActionEntity = POS.Data.Action;

namespace POS.API.Tests.Infra;

/// <summary>
/// Creates the canonical deterministic dataset for integration tests (per-factory SQLite database).
/// Mirrors the shared seed defined in Test-Documentation/00_TEST_STRATEGY.md §6.
/// Seeded state (canonical scenario S1):
///   Product P-A: sales 100.00, purchase 60.00, GST-17 (output account 2150-01), stock 100 @ L1
///   Product P-B: sales 50.00, purchase 30.00, no tax, stock 100 @ L1
/// </summary>
public sealed class TestSeed(IServiceProvider serviceProvider)
{
    public const string AdminEmail = "admin@gmail.com";
    public const string AdminPassword = "admin@123";
    public const string NoClaimsEmail = "noclaims@test.local";
    public const string NoClaimsPassword = "user@123";
    public const string SuperAdminEmail = "super@milpos.local";
    public const string SuperAdminPassword = "super@123";
    public const string TenantBAdminEmail = "admin-b@testb.local";
    public const string TenantBAdminPassword = "admin@123b";

    /// <summary>Claims granted to the admin role (covers Wave-0 + Wave-1 sales/purchase/stock paths).</summary>
    public static readonly string[] AdminClaims =
    [
        "POS_POS",
        "SO_ADD_SO", "SO_VIEW_SALES_ORDERS", "SO_UPDATE_SO", "SO_DELETE_SO", "SO_RETURN_SO",
        "SO_GENERATE_INVOICE", "SO_VIEW_SO_DETAIL",
        "SO_ADD_SO_PAYMENT", "SO_VIEW_SO_PAYMENTS", "SO_DELETE_SO_PAYMENT", "REP_SO_PAYMENT_REP",
        "SOR_ADD_SO_REQUEST", "SOR_VIEW_SO_REQUESTS", "SOR_UPDATE_SO_REQUEST", "SOR_DELETE_SO_REQUEST", "SOR_CONVERT_TO_SO",
        "PO_ADD_PO", "PO_VIEW_PURCHASE_ORDERS", "PO_UPDATE_PO", "PO_DELETE_PO", "PO_RETURN_PO", "PO_GENERATE_INVOICE", "PO_VIEW_PO_DETAIL",
        "PO_ADD_PO_PAYMENT", "PO_VIEW_PO_PAYMENTS", "PO_DELETE_PO_PAYMENT",
        "POR_ADD_PO_REQUEST", "POR_VIEW_PO_REQUESTS", "POR_UPDATE_PO_REQUEST", "POR_DELETE_PO_REQUEST", "POR_CONVERT_TO_PO",
        "INVE_VIEW_INVENTORIES", "INVE_MANAGE_INVENTORY", "REP_STOCK_REPORT",
        "STTFR_MANAGE_STTFR", "STTFR_VIEW_STTFR",
        "PRO_MANAGE_BRAND",
        "PRO_MANAGE_UNIT", "PRO_MANAGE_PRO_CAT",
        "PRO_ADD_PRODUCT", "PRO_UPDATE_PRODUCT", "PRO_DELETE_PRODUCT", "PRO_VIEW_PRODUCTS",
        "SUPP_VIEW_SUPPLIERS", "SUPP_ADD_SUPPLIER", "SUPP_UPDATE_SUPPLIER", "SUPP_DELETE_SUPPLIER",
        "CUST_VIEW_CUSTOMERS", "CUST_ADD_CUSTOMER", "CUST_UPDATE_CUSTOMER", "CUST_DELETE_CUSTOMER",
        "CUST_MANAGE_CUSTOMER_LADGER", "CUST_VIEW_CUSTOMER_LADGERS",
        "SETT_MANAGE_LOCATIONS",
        "PRO_MANAGE_TAX",
        "EXP_MANAGE_EXP_CATEGORY", "EXP_VIEW_EXPENSES", "EXP_ADD_EXPENSE", "EXP_UPDATE_EXPENSE", "EXP_DELETE_EXPENSE",
        "INQ_ADD_INQUIRY", "INQ_UPDATE_INQUIRY", "INQ_VIEW_INQUIRIES", "INQ_DELETE_INQUIRY", "INQ_MANAGE_INQ_STATUS", "INQ_MANAGE_INQ_SOURCE",
        "DMG_ST_VIEW_DMG_ST", "DMG_ST_MANAGE_DMG_ST",
        "ACCOUNTING_VIEW_TRIAL_BALANCE_REPORT", "ACCOUNTING_VIEW_PROFIT_LOSS_REPORT",
        "ACCOUNTING_VIEW_BALANCE_SHEET_REPORT", "ACCOUNTING_VIEW_CASH_BANK_REPORT",
        "ACCOUNTING_VIEW_FINANCIAL_YEARS", "ACCOUNTING_VIEW_TAX_REPORT",
        "ACCOUNTING_VIEW_GENERAL_ENTRY_REPORT", "ACCOUNTING_VIEW_ACCOUNT_BALANCE_REPORT",
        "ACCOUNTING_VIEW_CASH_FLOW_REPORT", "ACCOUNTING_ADD_GENERAL_ENTRY", "ACCOUNTING_VIEW_TRANSACTIONS",
        "ACCOUNTING_VIEW_BOOK_CLOSE",
        "ACCOUNTING_VIEW_LEDGER_ACCOUNTS", "ACCOUNTING_ADD_LEDGER_ACCOUNT", "ACCOUNTING_UPDATE_LEDGER_ACCOUNT",
        "MANAGE_OPENING_BALANCE", "ACCOUNTING_MANAGE_FINANCIAL_YEAR",
        "EMAIL_SEND_EMAIL", "EMAIL_MANAGE_EMAIL_SMTP_SETTINS", "EMAIL_MANAGE_EMAIL_TEMPLATES",
        "LOGS_VIEW_EMAIL_LOGS", "LOGS_DELETE_EMAIL_LOG",
        "REM_VIEW_REMINDERS", "REM_UPDATE_REMINDER", "REM_DELETE_REMINDER",
    ];

    public async Task SeedAsync()
    {
        var userManager = serviceProvider.GetRequiredService<UserManager<User>>();
        var roleManager = serviceProvider.GetRequiredService<RoleManager<Role>>();
        var context = serviceProvider.GetRequiredService<POSDbContext>();

        // Guard: idempotent (seed runs once per factory, but keep safe).
        if (await context.Tenants.IgnoreQueryFilters().AnyAsync(t => t.Id == TestIds.TenantAId))
        {
            return;
        }

        var tenantA = new Tenant
        {
            Id = TestIds.TenantAId,
            Name = "Test Tenant A",
            Subdomain = "testa",
            ContactEmail = AdminEmail,
            IsActive = true,
            CreatedDate = DateTime.UtcNow,
            SubscriptionPlan = "Desktop",
            MaxUsers = 999,
            LicenseType = "Full",
            ApiKey = "test-api-key-a",
            ApiKeyEnabled = true
        };
        context.Tenants.Add(tenantA);

        var tenantB = new Tenant
        {
            Id = TestIds.TenantBId,
            Name = "Test Tenant B",
            Subdomain = "testb",
            ContactEmail = "b@test.local",
            IsActive = true,
            CreatedDate = DateTime.UtcNow,
            SubscriptionPlan = "Trial",
            MaxUsers = 5,
            LicenseType = "Trial",
            TrialExpiryDate = DateTime.UtcNow.AddDays(1),
            ApiKey = "test-api-key-b",
            ApiKeyEnabled = true
        };
        context.Tenants.Add(tenantB);

        // Tenants first: every audited entity carries an FK to Users via the audit interceptor,
        // so identity must exist before the business rows are saved.
        var savedTenants = await context.SaveChangesAsync();

        // PRODUCT DRIFT WORKAROUND (documented): the SQLite migration set is 3 migrations behind the
        // EF model (PostgreSQL has MainInit + SalesPerson + 2 optimization migrations; SQLite only MainInit,
        // and POSDbContext ignores PendingModelChangesWarning). Patch the known missing columns on the
        // TEST database only; every entry here is a finding to report for the desktop schema.
        await PatchMissingColumnsAsync(context);

        await SeedIdentityAndCoreDataAsync(userManager, roleManager, context);
    }

    /// <summary>SQLite schema drift shim — each entry is a product finding (SQLite migrations behind model).</summary>
    private static async Task PatchMissingColumnsAsync(POSDbContext context)
    {
        // Missing columns correspond to POS.Migrations.PostgreSQL 20260410054625_SalesPersonPostgreSQL
        // (the only column-adding migration SQLite lacks).
        await EnsureColumnAsync(context, "Customers", "LocationId", "TEXT");
        await EnsureColumnAsync(context, "Customers", "SalesPersonId", "TEXT");
        await EnsureColumnAsync(context, "SalesOrders", "SalesPersonId", "TEXT");
        await EnsureColumnAsync(context, "PurchaseOrders", "SalesPersonId", "TEXT");
    }

    private static async Task EnsureColumnAsync(POSDbContext context, string table, string column, string type)
    {
        var connection = context.Database.GetDbConnection();
        if (connection.State != System.Data.ConnectionState.Open)
        {
            await connection.OpenAsync();
        }
        using var command = connection.CreateCommand();
        command.CommandText = $"SELECT COUNT(*) FROM pragma_table_info('{table}') WHERE name = '{column}'";
        var exists = Convert.ToInt64(await command.ExecuteScalarAsync()) > 0;
        if (!exists)
        {
            Console.WriteLine($"SCHEMA-DRIFT: patching test database — {table}.{column} missing in SQLite migrations");
            using var alter = connection.CreateCommand();
            alter.CommandText = $"ALTER TABLE {table} ADD COLUMN {column} {type}";
            await alter.ExecuteNonQueryAsync();
        }
    }

    // --- Identity: roles, claims, users, then core reference data ---
    private async Task SeedIdentityAndCoreDataAsync(UserManager<User> userManager, RoleManager<Role> roleManager, POSDbContext context)
    {
        var adminRole = new Role
        {
            Id = TestIds.AdminRoleId,
            Name = "Admin",
            TenantId = TestIds.TenantAId,
            IsDeleted = false,
            CreatedDate = DateTime.UtcNow
        };
        await roleManager.CreateAsync(adminRole);

        var noClaimsRole = new Role
        {
            Id = TestIds.NoClaimsRoleId,
            Name = "NoClaims",
            TenantId = TestIds.TenantAId,
            IsDeleted = false,
            CreatedDate = DateTime.UtcNow
        };
        await roleManager.CreateAsync(noClaimsRole);

        var admin = new User
        {
            Id = TestIds.AdminUserId,
            UserName = AdminEmail,
            Email = AdminEmail,
            EmailConfirmed = true,
            TenantId = TestIds.TenantAId,
            FirstName = "Test",
            LastName = "Admin",
            IsActive = true,
            IsAllLocations = true,
            CreatedDate = DateTime.UtcNow,
            ModifiedDate = DateTime.UtcNow
        };
        var createAdmin = await userManager.CreateAsync(admin, AdminPassword);
        if (!createAdmin.Succeeded)
        {
            throw new InvalidOperationException("Admin user seed failed: " + string.Join(", ", createAdmin.Errors));
        }
        await userManager.AddToRoleAsync(admin, "Admin");

        var noClaimsUser = new User
        {
            Id = TestIds.NoClaimsUserId,
            UserName = NoClaimsEmail,
            Email = NoClaimsEmail,
            EmailConfirmed = true,
            TenantId = TestIds.TenantAId,
            FirstName = "No",
            LastName = "Claims",
            IsActive = true,
            IsAllLocations = true,
            CreatedDate = DateTime.UtcNow,
            ModifiedDate = DateTime.UtcNow
        };
        var createNoClaims = await userManager.CreateAsync(noClaimsUser, NoClaimsPassword);
        if (!createNoClaims.Succeeded)
        {
            throw new InvalidOperationException("NoClaims user seed failed: " + string.Join(", ", createNoClaims.Errors));
        }
        await userManager.AddToRoleAsync(noClaimsUser, "NoClaims");

        // Tenant B admin (tenant-isolation tests authenticate with a TenantId=B JWT).
        var tenantBAdmin = new User
        {
            Id = TestIds.TenantBAdminUserId,
            UserName = "admin-b@testb.local",
            Email = "admin-b@testb.local",
            EmailConfirmed = true,
            TenantId = TestIds.TenantBId,
            FirstName = "Tenant B",
            LastName = "Admin",
            IsActive = true,
            IsAllLocations = true,
            CreatedDate = DateTime.UtcNow,
            ModifiedDate = DateTime.UtcNow
        };
        var createTenantBAdmin = await userManager.CreateAsync(tenantBAdmin, "admin@123b");
        if (!createTenantBAdmin.Succeeded)
        {
            throw new InvalidOperationException("Tenant B admin seed failed: " + string.Join(", ", createTenantBAdmin.Errors));
        }
        await userManager.AddToRoleAsync(tenantBAdmin, "Admin");

        // SuperAdmin (WF-2.2/2.4): the `isSuperAdmin` JWT claim bypasses trial enforcement and
        // drives X-Tenant-ID impersonation in TenantProvider. D02 trial/license tests.
        var superAdmin = new User
        {
            Id = TestIds.SuperAdminUserId,
            UserName = SuperAdminEmail,
            Email = SuperAdminEmail,
            EmailConfirmed = true,
            TenantId = TestIds.TenantAId,
            FirstName = "Master",
            LastName = "Super",
            IsActive = true,
            IsSuperAdmin = true,
            IsAllLocations = true,
            CreatedDate = DateTime.UtcNow,
            ModifiedDate = DateTime.UtcNow
        };
        var createSuperAdmin = await userManager.CreateAsync(superAdmin, SuperAdminPassword);
        if (!createSuperAdmin.Succeeded)
        {
            throw new InvalidOperationException("SuperAdmin seed failed: " + string.Join(", ", createSuperAdmin.Errors));
        }
        await userManager.AddToRoleAsync(superAdmin, "Admin");

        // Supplier with addresses (BillingAddressId/ShippingAddressId are non-nullable FKs).
        var supplierAddress = new SupplierAddress
        {
            Id = TestIds.SupplierS1AddressId,
            TenantId = TestIds.TenantAId,
            IsDeleted = false,
            Address = "Supplier Street 1",
            CountryName = "Pakistan",
            CityName = "Lahore",
            CreatedBy = TestIds.AdminUserId,
            ModifiedBy = TestIds.AdminUserId,
            CreatedDate = DateTime.UtcNow,
            ModifiedDate = DateTime.UtcNow
        };
        context.Set<SupplierAddress>().Add(supplierAddress);
        context.Set<Supplier>().Add(new Supplier
        {
            Id = TestIds.SupplierS1Id,
            TenantId = TestIds.TenantAId,
            IsDeleted = false,
            SupplierName = "Supplier One",
            ContactPerson = "Supplier Contact",
            Email = "supplier@test.local",
            MobileNo = "0300-0000002",
            BillingAddressId = TestIds.SupplierS1AddressId,
            ShippingAddressId = TestIds.SupplierS1AddressId,
            CreatedBy = TestIds.AdminUserId,
            ModifiedBy = TestIds.AdminUserId,
            CreatedDate = DateTime.UtcNow,
            ModifiedDate = DateTime.UtcNow
        });

        // RoleClaim.ActionId has FK_RoleClaims_Actions_ActionId, so claims are inserted directly
        // (AddClaimAsync cannot set ActionId) against a seeded permission Action row.
        // Users must already exist: CreatedBy carries FK_*_Users_CreatedBy.
        context.Set<Page>().Add(new Page
        {
            Id = TestIds.PermissionsPageId,
            TenantId = TestIds.TenantAId,
            IsDeleted = false,
            Name = "Test Permissions Page",
            Order = 1,
            CreatedBy = TestIds.AdminUserId,
            ModifiedBy = TestIds.AdminUserId,
            CreatedDate = DateTime.UtcNow,
            ModifiedDate = DateTime.UtcNow
        });
        context.Set<ActionEntity>().Add(new ActionEntity
        {
            Id = TestIds.PermissionsActionId,
            TenantId = TestIds.TenantAId,
            IsDeleted = false,
            Name = "Test Permission",
            Code = "TEST_PERMISSION",
            Order = 1,
            PageId = TestIds.PermissionsPageId,
            CreatedBy = TestIds.AdminUserId,
            ModifiedBy = TestIds.AdminUserId,
            CreatedDate = DateTime.UtcNow,
            ModifiedDate = DateTime.UtcNow
        });
        context.Set<RoleClaim>().AddRange(AdminClaims.Select(claim => new RoleClaim
        {
            RoleId = adminRole.Id,
            ClaimType = claim,
            ClaimValue = "true",
            ActionId = TestIds.PermissionsActionId
        }));
        await context.SaveChangesAsync();

        context.Set<CompanyProfile>().Add(new CompanyProfile
        {
            Id = Guid.NewGuid(),
            TenantId = TestIds.TenantAId,
            IsDeleted = false,
            Title = "Test Company A",
            Email = AdminEmail,
            CurrencyCode = "PKR",
            LicenseKey = "TEST-LICENSE-KEY",
            PurchaseCode = "TEST-PURCHASE-CODE"
        });

        // Tenant B is the canonical TRIAL tenant (WF-2.4): placeholder LicenseKey sentinel
        // AppConstants.Seeding.DefaultLicenseKey ("AAABBB") — an un-activated profile — with a
        // fresh 14-day trial clock. D02 trial/license tests mutate this state directly.
        context.Set<CompanyProfile>().Add(new CompanyProfile
        {
            Id = TestIds.TenantBProfileId,
            TenantId = TestIds.TenantBId,
            IsDeleted = false,
            Title = "Test Company B",
            Email = "admin-b@testb.local",
            CurrencyCode = "PKR",
            LicenseKey = "AAABBB",
            PurchaseCode = "CCCCRR",
            CreatedDate = DateTime.UtcNow,
            CreatedBy = TestIds.TenantBAdminUserId,
            ModifiedBy = TestIds.TenantBAdminUserId,
            ModifiedDate = DateTime.UtcNow
        });

        context.Set<FinancialYear>().Add(new FinancialYear
        {
            Id = TestIds.FinancialYear2026Id,
            TenantId = TestIds.TenantAId,
            IsDeleted = false,
            StartDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            EndDate = new DateTime(2026, 12, 31, 0, 0, 0, DateTimeKind.Utc),
            IsClosed = false
        });

        context.Set<LedgerAccount>().AddRange(
            Ledger(TestIds.LedgerArId, "1100", "Accounts Receivable", AccountType.Asset, AccountGroup.CurrentAsset),
            Ledger(TestIds.LedgerSalesId, "4100", "Sales Revenue", AccountType.Income, AccountGroup.Revenue),
            Ledger(TestIds.LedgerGstOutputParentId, "2150", "Output GST", AccountType.Liability, AccountGroup.CurrentLiability),
            Ledger(TestIds.LedgerGstInputParentId, "1150", "Input GST", AccountType.Asset, AccountGroup.CurrentAsset),
            Ledger(TestIds.LedgerGstOutputId, "2150-01", "Output GST 17%", AccountType.Liability, AccountGroup.CurrentLiability, TestIds.LedgerGstOutputParentId),
            Ledger(TestIds.LedgerGstInputId, "1150-01", "Input GST 17%", AccountType.Asset, AccountGroup.CurrentAsset, TestIds.LedgerGstInputParentId),
            Ledger(TestIds.LedgerInventoryId, "1200", "Inventory", AccountType.Asset, AccountGroup.CurrentAsset),
            Ledger(TestIds.LedgerCogsId, "5100", "Cost of Goods Sold", AccountType.Expense, AccountGroup.DirectExpense),
            Ledger(TestIds.LedgerExpenseId, "5300", "General Expense", AccountType.Expense, AccountGroup.IndirectExpense),
            Ledger(TestIds.LedgerDiscountId, "5200", "Discount Given", AccountType.Expense, AccountGroup.DirectExpense),
            Ledger(TestIds.LedgerRoundOffId, "5900", "Round Off", AccountType.Expense, AccountGroup.IndirectExpense),
            Ledger(TestIds.LedgerAdjustmentId, "5400", "Stock Adjustment", AccountType.Expense, AccountGroup.DirectExpense),
            Ledger(TestIds.LedgerCashId, "1050", "Cash", AccountType.Asset, AccountGroup.CurrentAsset),
            Ledger(TestIds.LedgerBankId, "1060", "Bank", AccountType.Asset, AccountGroup.CurrentAsset),
            Ledger(TestIds.LedgerApId, "2100", "Accounts Payable", AccountType.Liability, AccountGroup.CurrentLiability),
            Ledger(TestIds.OpeningBalanceAdjustmentId, "5555", "Opening Balance Adjustment", AccountType.Equity, AccountGroup.Capital)
        );

        var gst17 = new Tax
        {
            Id = TestIds.TaxGst17Id,
            TenantId = TestIds.TenantAId,
            IsDeleted = false,
            Name = "GST 17%",
            Percentage = 17.00m,
            InPutAccountCode = "1150-01",
            OutPutAccountCode = "2150-01"
        };
        context.Set<Tax>().Add(gst17);

        var locationL1 = new Location
        {
            Id = TestIds.LocationL1Id,
            TenantId = TestIds.TenantAId,
            IsDeleted = false,
            Name = "Main Branch L1",
            Address = "Test Street 1",
            Email = AdminEmail,
            Mobile = "0300-0000000",
            ContactPerson = "Test Contact",
            Website = "https://test.local",
            FBRKey = "TEST-FBR-KEY",
            POSID = "POS-01",
            ApiBaseUrl = "https://fbr.test.local",
            IsFBREnabled = false
        };
        context.Set<Location>().Add(locationL1);

        context.Set<Location>().Add(new Location
        {
            Id = TestIds.LocationFbrId,
            TenantId = TestIds.TenantAId,
            IsDeleted = false,
            Name = "FBR Branch",
            Address = "FBR Street 2",
            Email = AdminEmail,
            Mobile = "0300-0000003",
            ContactPerson = "FBR Contact",
            Website = "https://test.local",
            FBRKey = "TEST-FBR-KEY-2",
            POSID = "POS-02",
            ApiBaseUrl = "https://fbr.test.local",
            IsFBREnabled = true,
            AutoSubmitInvoices = true
        });

        var unitPc = new UnitConversation
        {
            Id = TestIds.UnitPcId,
            TenantId = TestIds.TenantAId,
            IsDeleted = false,
            Name = "Piece",
            Code = "PC"
        };
        var unitDz = new UnitConversation
        {
            Id = TestIds.UnitDzId,
            TenantId = TestIds.TenantAId,
            IsDeleted = false,
            Name = "Dozen",
            Code = "DZ",
            ParentId = unitPc.Id,
            Operator = Operator.Multiply,
            Value = 12m
        };
        context.Set<UnitConversation>().AddRange(unitPc, unitDz);

        var category = new ProductCategory
        {
            Id = TestIds.CategoryDefaultId,
            TenantId = TestIds.TenantAId,
            IsDeleted = false,
            Name = "Default Category"
        };
        context.Set<ProductCategory>().Add(category);

        context.Set<ExpenseCategory>().Add(new ExpenseCategory
        {
            Id = TestIds.ExpenseCategoryGeneralId,
            TenantId = TestIds.TenantAId,
            IsDeleted = false,
            Name = "General Expense"
        });

        context.Set<InquirySource>().Add(new InquirySource
        {
            Id = TestIds.InquirySourceWebId,
            TenantId = TestIds.TenantAId,
            IsDeleted = false,
            Name = "Website"
        });
        context.Set<InquiryStatus>().Add(new InquiryStatus
        {
            Id = TestIds.InquiryStatusOpenId,
            TenantId = TestIds.TenantAId,
            IsDeleted = false,
            Name = "Open"
        });

        var productA = new Product
        {
            Id = TestIds.ProductPcMonitorId,
            TenantId = TestIds.TenantAId,
            IsDeleted = false,
            Name = "Product A",
            Code = "P-A",
            Barcode = "PA-0001",
            UnitId = TestIds.UnitPcId,
            PurchasePrice = 60.00m,
            SalesPrice = 100.00m,
            CategoryId = TestIds.CategoryDefaultId
        };
        var productB = new Product
        {
            Id = TestIds.ProductNoTaxId,
            TenantId = TestIds.TenantAId,
            IsDeleted = false,
            Name = "Product B (No Tax)",
            Code = "P-B",
            Barcode = "PB-0001",
            UnitId = TestIds.UnitPcId,
            PurchasePrice = 30.00m,
            SalesPrice = 50.00m,
            CategoryId = TestIds.CategoryDefaultId
        };
        context.Set<Product>().AddRange(productA, productB);

        context.Set<ProductStock>().AddRange(
            new ProductStock
            {
                Id = Guid.NewGuid(),
                TenantId = TestIds.TenantAId,
                IsDeleted = false,
                ProductId = productA.Id,
                LocationId = TestIds.LocationL1Id,
                CurrentStock = 100m,
                PurchasePrice = 60.00m,
                ModifiedDate = DateTime.UtcNow
            },
            new ProductStock
            {
                Id = Guid.NewGuid(),
                TenantId = TestIds.TenantAId,
                IsDeleted = false,
                ProductId = productB.Id,
                LocationId = TestIds.LocationL1Id,
                CurrentStock = 100m,
                PurchasePrice = 30.00m,
                ModifiedDate = DateTime.UtcNow
            },
            new ProductStock
            {
                Id = Guid.NewGuid(),
                TenantId = TestIds.TenantAId,
                IsDeleted = false,
                ProductId = productA.Id,
                LocationId = TestIds.LocationFbrId,
                CurrentStock = 0m,
                PurchasePrice = 60.00m,
                ModifiedDate = DateTime.UtcNow
            });

        context.Set<Customer>().Add(new Customer
        {
            Id = TestIds.WalkInCustomerId,
            TenantId = TestIds.TenantAId,
            IsDeleted = false,
            CustomerName = "Walk-in Customer",
            IsWalkIn = true,
            MobileNo = "0300-0000001"
        });

        // Audit FKs (FK_*_Users_CreatedBy) require an existing user; stamp explicitly with the
        // seeded admin rather than relying on DefaultUser config resolution.
        foreach (var entry in context.ChangeTracker.Entries<BaseEntity>()
                     .Where(e => e.State == EntityState.Added))
        {
            if (entry.Entity.CreatedBy == Guid.Empty) entry.Entity.CreatedBy = TestIds.AdminUserId;
            if (entry.Entity.ModifiedBy == Guid.Empty) entry.Entity.ModifiedBy = TestIds.AdminUserId;
            if (entry.Entity.CreatedDate == default) entry.Entity.CreatedDate = DateTime.UtcNow;
            if (entry.Entity.ModifiedDate == default) entry.Entity.ModifiedDate = DateTime.UtcNow;
        }

        await context.SaveChangesAsync();
    }

    private static LedgerAccount Ledger(Guid id, string code, string name, AccountType type, AccountGroup group, Guid? parentAccountId = null) =>
        new()
        {
            Id = id,
            TenantId = TestIds.TenantAId,
            IsDeleted = false,
            AccountCode = code,
            AccountName = name,
            AccountType = type,
            AccountGroup = group,
            ParentAccountId = parentAccountId,
            OpeningBalance = 0m,
            IsActive = true,
            IsSystem = true
        };
}
