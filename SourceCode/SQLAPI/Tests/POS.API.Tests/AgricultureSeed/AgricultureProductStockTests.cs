using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using POS.Common;
using POS.Data;
using POS.Data.Entities;
using POS.Data.Entities.Licensing;
using POS.Domain;
using POS.Repository;
using Xunit;

namespace POS.API.Tests.AgricultureSeed;

/// <summary>
/// Tests that the raw CSV seeding path in <see cref="TenantRegistrationService.SeedProductsAsync"/>
/// creates ProductStock rows for Agriculture tenants (BusinessType = AG).
///
/// Finding N-47: ProductStocks.csv only carries PH/PT rows, so an Agriculture tenant seeded via
/// the CSV path ends up with zero ProductStock rows — POS can't sell them.
/// This test class defines the expected behavior (RED), which the production fix in SeedProductsAsync
/// must satisfy (GREEN).
///
/// TC traceability: Gap-Target (N-47 seed-stock-per-ag-product).
/// </summary>
public sealed class AgricultureProductStockTests : IClassFixture<AgricultureProductStockTests.Factory>
{
    private readonly Factory _factory;

    public AgricultureProductStockTests(Factory factory) => _factory = factory;

    /// <summary>
    /// After seeding an Agriculture tenant via the raw CSV path, every AG001–AG020 product must
    /// have at least one ProductStock row (CurrentStock 0, one per location) — mirroring the
    /// auto-stock behavior of <c>AddProductCommandHandler</c>.
    /// </summary>
    [Fact]
    public async Task Should_CreateProductStockRows_ForAllAgProducts()
    {
        // Touch the host so migrations apply.
        _ = _factory.CreateClient();

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<POSDbContext>();
        var registration = scope.ServiceProvider.GetRequiredService<ITenantRegistrationService>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();

        // Create a fresh Agriculture tenant (no master in DB → CSV path fires).
        var tenantId = Guid.NewGuid();
        var tenant = new Tenant
        {
            Id = tenantId,
            Name = "Test Agri Tenant",
            Subdomain = $"test-agri-{tenantId:N}",
            IsActive = true,
            CreatedDate = DateTime.UtcNow,
            BusinessType = AppConstants.BusinessType.Agriculture,
            Currency = "PKR",
            LicenseType = "Paid",
            SubscriptionPlan = "Paid",
            ApiKey = $"agrikey-{tenantId:N}",
            ApiKeyCreatedDate = DateTime.UtcNow,
            ApiKeyEnabled = true
        };
        db.Tenants.Add(tenant);
        await db.SaveChangesAsync();

        // Seed admin user (UserManager hashes the password). Its ID must match the
        // DefaultUser setting so the audit interceptor stamps real Creator IDs.
        var adminUser = new User
        {
            Id = Infra.TestIds.AdminUserId,
            TenantId = tenantId,
            UserName = $"admin-agri-{tenantId:N}@test.local",
            Email = $"admin-agri-{tenantId:N}@test.local",
            NormalizedEmail = $"admin-agri-{tenantId:N}@test.local".ToUpperInvariant(),
            NormalizedUserName = $"admin-agri-{tenantId:N}@test.local".ToUpperInvariant(),
            EmailConfirmed = true,
            IsActive = true,
            IsDeleted = false,
            IsSuperAdmin = true,
            IsAllLocations = true,
            CreatedDate = DateTime.UtcNow,
            ModifiedDate = DateTime.UtcNow,
            LockoutEnabled = true,
            SecurityStamp = Guid.NewGuid().ToString("N"),
            ConcurrencyStamp = Guid.NewGuid().ToString("N")
        };
        var createResult = await userManager.CreateAsync(adminUser, "admin@123");
        Assert.True(createResult.Succeeded, $"UserManager.CreateAsync failed: {string.Join(", ", createResult.Errors.Select(e => e.Description))}");

        // Seed all reference data via the raw CSV path.
        await registration.SeedTenantDataAsync(tenant, adminUser);

        // ---- Assert: AG products exist.
        var agProducts = await db.Products.IgnoreQueryFilters()
            .Where(p => p.TenantId == tenantId && p.Code.StartsWith("AG"))
            .ToListAsync();
        Assert.Equal(20, agProducts.Count);

        // ---- Assert: every AG product has at least one ProductStock row.
        var agProductIds = agProducts.Select(p => p.Id).ToList();
        var stockCount = await db.ProductStocks.IgnoreQueryFilters()
            .CountAsync(ps => agProductIds.Contains(ps.ProductId));
        Assert.True(stockCount >= 20, $"Expected ≥20 ProductStock rows for AG products, found {stockCount}");
    }

    /// <summary>
    /// Factory configured WITHOUT a master tenant so <see cref="TenantRegistrationService"/>
    /// falls through to the raw CSV seeding path.
    /// </summary>
    public sealed class Factory : WebApplicationFactory<Program>
    {
        private readonly string _dbPath = Path.Combine(Path.GetTempPath(), $"milpos_agri_{Guid.NewGuid():N}.db");

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Development");
            builder.UseSetting("DatabaseProvider", "Sqlite");
            builder.UseSetting("ConnectionStrings:SqliteConnectionString", $"Data Source={_dbPath}");
            builder.UseSetting("ConnectionStrings:SqliteHangfirConnectionString", _dbPath);
            builder.UseSetting("SeedingConfig:Enabled", "false");
            // Force the CSV path: no master tenant exists in the DB.
            builder.UseSetting("MasterTenant:SubDomain", "__none__");
            builder.UseSetting("MasterTenant:TenantId", Guid.Empty.ToString());
            // Audit interceptor stamps CreatedBy from this id to satisfy Customer/Location FKs.
            builder.UseSetting("DefaultUser:DefaultUserId", Infra.TestIds.AdminUserId.ToString());

            builder.ConfigureServices(services =>
            {
                // Strip background services to avoid SQLite locking contention.
                var toRemove = services
                    .Where(d => d.ServiceType == typeof(Microsoft.Extensions.Hosting.IHostedService) && d.ImplementationType != null
                        && ((d.ImplementationType.Namespace ?? "").StartsWith("POS.API.BackgroundServices", StringComparison.Ordinal)
                            || (d.ImplementationType.FullName ?? "").Contains("Hangfire", StringComparison.Ordinal)
                            || (d.ImplementationType.Namespace ?? "").StartsWith("ApiAndQueriesProfiler", StringComparison.Ordinal)))
                    .ToList();
                foreach (var d in toRemove) services.Remove(d);
            });
        }

        protected override void Dispose(bool disposing)
        {
            try { base.Dispose(disposing); } catch { }
            try { if (File.Exists(_dbPath)) File.Delete(_dbPath); if (File.Exists(_dbPath + "-shm")) File.Delete(_dbPath + "-shm"); if (File.Exists(_dbPath + "-wal")) File.Delete(_dbPath + "-wal"); } catch { }
        }
    }
}
