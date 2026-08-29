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

    /// <summary>Claims granted to the admin role (covers Wave-0 + Wave-1 sales/POS paths).</summary>
    public static readonly string[] AdminClaims =
    [
        "POS_POS",
        "SO_ADD_SO", "SO_VIEW_SALES_ORDERS", "SO_UPDATE_SO", "SO_DELETE_SO", "SO_RETURN_SO",
        "SO_GENERATE_INVOICE", "SO_VIEW_SO_DETAIL",
        "SOR_ADD_SO_REQUEST", "SOR_VIEW_SO_REQUESTS", "SOR_UPDATE_SO_REQUEST", "SOR_DELETE_SO_REQUEST", "SOR_CONVERT_TO_SO",
        "PAY_VIEW_SALES_PAYMENT", "PAY_ADD_SALES_PAYMENT", "PAY_DELETE_SALES_PAYMENT"
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
            SubscriptionPlan = "Desktop",
            MaxUsers = 999,
            LicenseType = "Full",
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

        context.Set<FinancialYear>().Add(new FinancialYear
        {
            Id = Guid.NewGuid(),
            TenantId = TestIds.TenantAId,
            IsDeleted = false,
            StartDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            EndDate = new DateTime(2026, 12, 31, 0, 0, 0, DateTimeKind.Utc),
            IsClosed = false
        });

        context.Set<LedgerAccount>().AddRange(
            Ledger(TestIds.LedgerArId, "1100", "Accounts Receivable", AccountType.Asset, AccountGroup.CurrentAsset),
            Ledger(TestIds.LedgerSalesId, "4100", "Sales Revenue", AccountType.Income, AccountGroup.Revenue),
            Ledger(TestIds.LedgerGstOutputId, "2150-01", "Output GST 17%", AccountType.Liability, AccountGroup.CurrentLiability),
            Ledger(TestIds.LedgerGstInputId, "1150-01", "Input GST 17%", AccountType.Asset, AccountGroup.CurrentAsset),
            Ledger(TestIds.LedgerInventoryId, "1200", "Inventory", AccountType.Asset, AccountGroup.CurrentAsset),
            Ledger(TestIds.LedgerCogsId, "5100", "Cost of Goods Sold", AccountType.Expense, AccountGroup.DirectExpense),
            Ledger(TestIds.LedgerDiscountId, "5200", "Discount Given", AccountType.Expense, AccountGroup.DirectExpense),
            Ledger(TestIds.LedgerRoundOffId, "5900", "Round Off", AccountType.Expense, AccountGroup.IndirectExpense),
            Ledger(TestIds.LedgerCashId, "1050", "Cash", AccountType.Asset, AccountGroup.CurrentAsset),
            Ledger(TestIds.LedgerBankId, "1060", "Bank", AccountType.Asset, AccountGroup.CurrentAsset),
            Ledger(TestIds.LedgerApId, "2100", "Accounts Payable", AccountType.Liability, AccountGroup.CurrentLiability)
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

        // TEMP DIAGNOSTIC
        var pageEntry = context.ChangeTracker.Entries<Page>().FirstOrDefault();
        Console.WriteLine($"DIAG adminUserId={TestIds.AdminUserId} usersExist={await context.Users.IgnoreQueryFilters().AnyAsync(u => u.Id == TestIds.AdminUserId)} pageCreatedBy={(pageEntry != null ? pageEntry.Entity.CreatedBy.ToString() : "none")}");

        await context.SaveChangesAsync();
    }

    private static LedgerAccount Ledger(Guid id, string code, string name, AccountType type, AccountGroup group) =>
        new()
        {
            Id = id,
            TenantId = TestIds.TenantAId,
            IsDeleted = false,
            AccountCode = code,
            AccountName = name,
            AccountType = type,
            AccountGroup = group,
            OpeningBalance = 0m,
            IsActive = true,
            IsSystem = true
        };
}
