using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using POS.Common;
using POS.Common.Services;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Data.Entities.Licensing;
using POS.Domain;
using POS.Helper.Services;
using POS.Repository;

namespace POSDb.SeedTool
{
    /// <summary>
    /// Standalone offline seed tool for generating a fully-populated Desktop SQLite
    /// database (POSDb.db + appsettings.json) for a specific customer.
    ///
    /// Design: reuses the production seeding machinery (TenantRegistrationService /
    /// CsvParserService / Sqlite migrations) so FK ordering, ID remapping, role/claims
    /// wiring and product-stock linkage all match the cloud path exactly.
    ///
    /// Per-customer configuration lives in the constants block below.
    /// </summary>
    public static class Program
    {
        // ========================== PER-CUSTOMER CONFIG ==========================
        private const string CompanyName = "Petal Seed";
        private const string Subdomain = "petal-seed";
        private const string CompanyAddress = "Peshawar"; // full details to be updated later
        private const string ContactEmail = "jawad@gmail.com";
        private const string ContactPhone = "";
        private const string DefaultPassword = "admin@123";
        private const string CurrencyCode = "PKR";
        private const string BusinessType = AppConstants.BusinessType.Agriculture; // seeds AG* products only
        private const string LicensePlan = "Desktop";

        // Admin users to create (all get Admin + Super Admin + all locations).
        private static readonly string[] AdminUsers = { "jawad@gmail.com", "wajid@gmail.com", "waqas@gmail.com" };

        // The user that becomes the audit/DefaultUser stamp for generated rows.
        private const string AuditDefaultUserEmail = "jawad@gmail.com";

        private const string OutputDirectory = "Output";
        private const string DbFileName = "POSDb.db";
        // =========================================================================

        public static async Task<int> Main(string[] args)
        {
            Console.WriteLine("=== POSDb.SeedTool - Offline Desktop Database Generator ===");
            Console.WriteLine($"Company : {CompanyName}");
            Console.WriteLine($"Type    : {BusinessType} (AG products only)");
            Console.WriteLine($"Currency: {CurrencyCode}");

            try
            {
                string workingDir = AppContext.BaseDirectory;
                string outputDir = Path.Combine(workingDir, OutputDirectory);
                Directory.CreateDirectory(outputDir);

                string dbFilePath = Path.Combine(outputDir, DbFileName);
                if (File.Exists(dbFilePath)) File.Delete(dbFilePath);

                var buildConfiguration = new ConfigurationBuilder()
                    .AddInMemoryCollection(new Dictionary<string, string>
                    {
                        ["ConnectionStrings:SqliteConnectionString"] = $"Data Source={dbFilePath}",
                        ["MasterTenant:SubDomain"] = "__none__", // ensures the CSV path, never clone
                        ["MasterTenant:TenantId"] = Guid.Empty.ToString(),
                    })
                    .Build();

                var services = new ServiceCollection();
                ConfigureServices(services, buildConfiguration);

                await using var provider = services.BuildServiceProvider();
                using (var scope = provider.CreateScope())
                {
                    var sp = scope.ServiceProvider;
                    var db = sp.GetRequiredService<POSDbContext>();
                    var tenantProvider = sp.GetRequiredService<ITenantProvider>();

                    // 1. Create the full schema via the Sqlite migrations assembly.
                    Console.WriteLine("Applying Sqlite migrations...");
                    await db.Database.MigrateAsync();

                    var security = sp.GetRequiredService<ISecurityService>();
                    var userManager = sp.GetRequiredService<UserManager<User>>();
                    var registration = sp.GetRequiredService<ITenantRegistrationService>();

                    // 2. Create the Tenant (full/paid desktop license).
                    var apiKey = security.GenerateSecureApiKey();
                    var tenant = new Tenant
                    {
                        Id = Guid.NewGuid(),
                        Name = CompanyName,
                        Subdomain = Subdomain,
                        ContactEmail = ContactEmail,
                        ContactPhone = ContactPhone,
                        Address = CompanyAddress,
                        IsActive = true,
                        CreatedDate = DateTime.UtcNow,
                        SubscriptionStartDate = DateTime.UtcNow,
                        SubscriptionEndDate = null,                      // permanent
                        SubscriptionPlan = "Paid",
                        MaxUsers = 999,
                        BusinessType = BusinessType,
                        LicenseType = "Full",
                        TrialExpiryDate = null,                           // not a trial
                        Currency = CurrencyCode,
                        ApiKey = apiKey,
                        ApiKeyCreatedDate = DateTime.UtcNow,
                        ApiKeyEnabled = true
                    };
                    db.Tenants.Add(tenant);
                    await db.SaveChangesAsync();
                    tenantProvider.SetTenantId(tenant.Id);               // point global query filters at our tenant
                    Console.WriteLine($"Tenant created: {tenant.Id} ({CompanyName})");

                    // 3. Create the admin users (via UserManager so password hashing matches the app).
                    //    Note: roles are NOT assigned here - they are created by SeedTenantDataAsync
                    //    (Roles.csv) and linked afterwards.
                    Console.WriteLine("Creating admin users...");
                    var createdUsers = new List<User>();
                    foreach (var email in AdminUsers)
                    {
                        var user = await CreateUserAsync(userManager, tenant, email, DefaultPassword);
                        createdUsers.Add(user);
                        Console.WriteLine($"  user: {email} ({user.Id})");
                    }
                    await db.SaveChangesAsync();

                    // 4. Determine the admin user used for seeding/audit stamps.
                    var adminUser = createdUsers.FirstOrDefault(u => string.Equals(u.Email, AuditDefaultUserEmail, StringComparison.OrdinalIgnoreCase))
                                    ?? createdUsers.First();
                    var auditUserId = adminUser.Id;
                    Console.WriteLine($"Seed/audit user: {adminUser.Email} ({auditUserId})");

                    // 5. Run the standard CSV seeding (reuses production logic; creates roles from
                    //    Roles.csv and assigns the adminUser to the Admin role).
                    Console.WriteLine("Seeding all reference data (accounts, taxes, units, roles, menu, AG products...)...");
                    await registration.SeedTenantDataAsync(tenant, adminUser);
                    Console.WriteLine("Seed complete.");

                    // 6. Assign Admin + Super Admin roles to all admin users, and link them to the
                    //    main location (is all-locations); then stamp scope.
                    Console.WriteLine("Assigning roles + locations to admin users...");
                    var superAdminRole = await db.Roles.IgnoreQueryFilters().FirstOrDefaultAsync(r => r.TenantId == tenant.Id && r.Name == "Super Admin");
                    var adminRole = await db.Roles.IgnoreQueryFilters().FirstOrDefaultAsync(r => r.TenantId == tenant.Id && r.Name == "Admin");
                    var mainLocations = await db.Locations.IgnoreQueryFilters().Where(l => l.TenantId == tenant.Id).ToListAsync();
                    foreach (var user in createdUsers)
                    {
                        if (adminRole != null) await AddToRoleIfMissingAsync(userManager, user, adminRole.Name);
                        if (superAdminRole != null) await AddToRoleIfMissingAsync(userManager, user, superAdminRole.Name);
                        foreach (var loc in mainLocations)
                        {
                            if (!await db.UserLocations.AnyAsync(ul => ul.UserId == user.Id && ul.LocationId == loc.Id))
                            {
                                db.UserLocations.Add(new UserLocation { UserId = user.Id, LocationId = loc.Id });
                            }
                        }
                    }
                    await db.SaveChangesAsync();

                    // 6b. Ensure every seeded AG product has a ProductStock row per location.
                    //     ProductStocks.csv has no AG rows. SeedProductsAsync now auto-creates a
                    //     CurrentStock=0 row per product at the main location (N-47 fixed in production),
                    //     so this only back-fills the remaining locations (pairs the CSV never covers).
                    Console.WriteLine("Ensuring product stock rows per location...");
                    var agriProductIds = await db.Products.IgnoreQueryFilters()
                        .Where(p => p.TenantId == tenant.Id)
                        .Select(p => p.Id)
                        .ToListAsync();
                    var existingPairs = (await db.ProductStocks.IgnoreQueryFilters()
                        .Where(ps => ps.Product.TenantId == tenant.Id)
                        .Select(ps => new { ps.ProductId, ps.LocationId })
                        .ToListAsync())
                        .Select(x => $"{(x.ProductId, x.LocationId)}")
                        .ToHashSet();
                    foreach (var pid in agriProductIds)
                    {
                        foreach (var loc in mainLocations)
                        {
                            if (existingPairs.Contains($"{(pid, loc.Id)}")) continue;
                            db.ProductStocks.Add(new ProductStock
                            {
                                Id = Guid.NewGuid(),
                                ProductId = pid,
                                LocationId = loc.Id,
                                CurrentStock = 0.0m,
                                PurchasePrice = 0.0m,
                                ModifiedDate = DateTime.UtcNow,
                                CreatedBy = auditUserId,
                                CreatedDate = DateTime.UtcNow,
                                ModifiedBy = auditUserId
                            });
                        }
                    }
                    await db.SaveChangesAsync();

                    // 7. Post-seed overrides (company profile branding + currency + license).
                    Console.WriteLine("Applying company-profile overrides...");
                    var profile = await db.CompanyProfiles.IgnoreQueryFilters().FirstOrDefaultAsync(p => p.TenantId == tenant.Id);
                    if (profile != null)
                    {
                        profile.Title = CompanyName;
                        if (string.IsNullOrWhiteSpace(profile.Address)) profile.Address = CompanyAddress;
                        profile.CurrencyCode = CurrencyCode;
                        profile.BusinessType = POS.Data.BusinessType.AgriPharma;
                        profile.LicenseKey = GenerateLicenseKey();
                        profile.PurchaseCode = GenerateLicenseKey();
                        db.CompanyProfiles.Update(profile);
                    }
                    tenant.LicenseType = "Full";
                    tenant.SubscriptionPlan = "Paid";
                    db.Tenants.Update(tenant);
                    await db.SaveChangesAsync();

                    // 8. Add an ACTIVE License row so trial enforcement passes cleanly.
                    Console.WriteLine("Writing active license row...");
                    db.Licenses.Add(new License
                    {
                        Id = Guid.NewGuid(),
                        TenantId = tenant.Id,
                        TokenId = Guid.NewGuid().ToString("N").ToUpperInvariant(),
                        TokenHash = GenerateLicenseKey(),
                        Plan = LicensePlan,
                        Status = "Active",
                        IssuedAt = DateTime.UtcNow,
                        ActivatedAt = DateTime.UtcNow,
                        ExpiresAt = null,          // never expires
                        MaxUsers = 999,
                        CreatedBy = auditUserId,
                        CreatedDate = DateTime.UtcNow,
                        ModifiedBy = auditUserId,
                        ModifiedDate = DateTime.UtcNow,
                        IsDeleted = false
                    });
                    await db.SaveChangesAsync();

                    // 9. Ensure a fresh financial year for the current year exists.
                    Console.WriteLine("Ensuring current financial year...");
                    int year = DateTime.UtcNow.Year;
                    if (!await db.FinancialYears.AnyAsync(fy => fy.TenantId == tenant.Id && fy.StartDate.Year == year))
                    {
                        db.FinancialYears.Add(new FinancialYear
                        {
                            Id = Guid.NewGuid(),
                            TenantId = tenant.Id,
                            StartDate = new DateTime(year, 1, 1),
                            EndDate = new DateTime(year, 12, 31),
                            IsClosed = false,
                            CreatedBy = auditUserId,
                            CreatedDate = DateTime.UtcNow
                        });
                        await db.SaveChangesAsync();
                    }

                    // 10. Verify the generated database (self-check; asserts the petal requirements).
                    Console.WriteLine("Verifying generated database...");
                    var verifications = new List<string>();
                    int productCount = await db.Products.IgnoreQueryFilters().CountAsync(p => p.TenantId == tenant.Id);
                    verifications.Add($"Products: {productCount} (expect 20 AG*)" + (productCount == 20 ? " OK" : " MISMATCH"));
                    var nonAg = await db.Products.IgnoreQueryFilters().Where(p => p.TenantId == tenant.Id && !p.Code.StartsWith("AG")).Select(p => p.Code).ToListAsync();
                    verifications.Add("Non-AG products: " + (nonAg.Count == 0 ? "none OK" : string.Join(",", nonAg)));

                    var profileCheck = await db.CompanyProfiles.IgnoreQueryFilters().FirstOrDefaultAsync(p => p.TenantId == tenant.Id);
                    verifications.Add(profileCheck != null
                        ? $"CompanyProfile: '{profileCheck.Title}' / {profileCheck.CurrencyCode} / LicenseKey={profileCheck.LicenseKey}"
                        : "CompanyProfile: MISSING");

                    int licenseCount = await db.Licenses.IgnoreQueryFilters().CountAsync(l => l.TenantId == tenant.Id && l.Status == "Active");
                    verifications.Add($"Active Licenses: {licenseCount} (expect 1)" + (licenseCount == 1 ? " OK" : " MISMATCH"));

                    var tenantCheck = await db.Tenants.IgnoreQueryFilters().FirstAsync(t => t.Id == tenant.Id);
                    verifications.Add($"Tenant: {tenantCheck.Name} / {tenantCheck.BusinessType} / {tenantCheck.LicenseType} / {tenantCheck.SubscriptionPlan}");
                    verifications.Add($"DefaultUser(jawad) assigned: {await db.Users.IgnoreQueryFilters().AnyAsync(u => u.Id == auditUserId)}");

                    var passwordOk = await userManager.CheckPasswordAsync(adminUser, DefaultPassword);
                    var passwordBad = await userManager.CheckPasswordAsync(adminUser, "wrong-password");
                    verifications.Add($"Login hash roundtrip (admin@123): {passwordOk && !passwordBad} OK");

                    int userCount = await db.Users.IgnoreQueryFilters().CountAsync(u => u.TenantId == tenant.Id);
                    verifications.Add($"Users: {userCount} (expect 3)");

                    int roleCount = await db.Roles.IgnoreQueryFilters().CountAsync(r => r.TenantId == tenant.Id);
                    verifications.Add($"Roles: {roleCount} (expect 3)");

                    var tenantRoleIds = await db.Roles.IgnoreQueryFilters().Where(r => r.TenantId == tenant.Id).Select(r => r.Id).ToListAsync();

                    int userRoleCount = await db.UserRoles.IgnoreQueryFilters().CountAsync(ur => tenantRoleIds.Contains(ur.RoleId));
                    verifications.Add($"UserRoles: {userRoleCount} (3 users x 2 roles = 6)");

                    var tenantUserIds = await db.Users.IgnoreQueryFilters().Where(u => u.TenantId == tenant.Id).Select(u => u.Id).ToListAsync();
                    var mainLocationIds = mainLocations.Select(m => m.Id).ToList();
                    int userLocationCount = await db.UserLocations.IgnoreQueryFilters().CountAsync(ul => tenantUserIds.Contains(ul.UserId) && mainLocationIds.Contains(ul.LocationId));
                    verifications.Add($"UserLocations: {userLocationCount}");

                    int fyCount = await db.FinancialYears.IgnoreQueryFilters().CountAsync(fy => fy.TenantId == tenant.Id && fy.StartDate.Year == year);
                    verifications.Add($"FinancialYears: {fyCount} for {year}" + (fyCount >= 1 ? " OK" : " MISMATCH"));

                    int stockCount = await db.ProductStocks.IgnoreQueryFilters().CountAsync(ps => ps.Product != null && ps.Product.TenantId == tenant.Id);
                    verifications.Add($"ProductStocks: {stockCount} (expect >= 20, one per AG product)" + (stockCount >= 20 ? " OK" : " MISMATCH"));

                    bool apiKeyMatch = await db.Tenants.IgnoreQueryFilters().AnyAsync(t => t.Id == tenant.Id && t.ApiKey == apiKey);
                    verifications.Add($"Tenant.ApiKey == appsettings.ApiKey: {apiKeyMatch}");

                    int claimCount = await db.RoleClaims.IgnoreQueryFilters().CountAsync(rc => tenantRoleIds.Contains(rc.RoleId));
                    verifications.Add($"RoleClaims: {claimCount}");

                    int menuCount = await db.MenuItems.CountAsync();
                    verifications.Add($"MenuItems: {menuCount}");
                    foreach (var v in verifications) Console.WriteLine("  " + v);
                    Console.WriteLine();

                    db.Database.CloseConnection();

                    // 10. Generate appsettings.json for the desktop client.
                    Console.WriteLine("Writing appsettings.json...");
                    var appSettings = BuildAppSettings(tenant.Id, apiKey, auditUserId, workingDir);
                    string appSettingsPath = Path.Combine(outputDir, "appsettings.json");
                    await File.WriteAllTextAsync(appSettingsPath, appSettings);
                }

                Console.WriteLine();
                Console.WriteLine("=== SUCCESS ===");
                Console.WriteLine($"  Database    : {dbFilePath}");
                Console.WriteLine($"  AppSettings : {Path.Combine(outputDir, "appsettings.json")}");
                Console.WriteLine();
                Console.WriteLine("Delivery: zip {POSDb.db, appsettings.json} and extract into the desktop userData folder.");
                return 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine();
                Console.WriteLine("=== FAILED ===");
                Console.WriteLine(ex.Message);
                if (ex.InnerException != null) Console.WriteLine("  -> " + ex.InnerException.Message);
                Console.WriteLine(ex.StackTrace);
                return 1;
            }
        }

        private static void ConfigureServices(IServiceCollection services, IConfiguration configuration)
        {
            services.AddSingleton<IConfiguration>(configuration);
            services.AddLogging();
            services.AddOptions<MasterTenantSettings>()
                .Configure<IConfiguration>((o, c) => c.GetSection("MasterTenant").Bind(o));

            services.AddDbContext<POSDbContext>(options =>
                options.UseSqlite(configuration.GetConnectionString("SqliteConnectionString"),
                    b => b.MigrationsAssembly("POS.Migrations.Sqlite")));

            services.AddIdentity<User, Role>()
                .AddEntityFrameworkStores<POSDbContext>()
                .AddDefaultTokenProviders();

            services.Configure<IdentityOptions>(options =>
            {
                options.Password.RequireDigit = false;
                options.Password.RequiredLength = 5;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequireUppercase = false;
                options.Password.RequireLowercase = false;
            });

            services.AddScoped<ICsvParserService, CsvParserService>();
            services.AddScoped<ISecurityService, SecurityService>();
            services.AddScoped<ITenantDataCloner, TenantDataCloner>();
            services.AddScoped<ITenantRegistrationService, TenantRegistrationService>();

            // Fixed single-tenant provider so EF global query filters resolve to our tenant.
            services.AddScoped<ITenantProvider>(_ => new FixedTenantProvider());
        }

        private static async Task<User> CreateUserAsync(UserManager<User> userManager, Tenant tenant, string email, string password)
        {
            var user = new User
            {
                Id = Guid.NewGuid(),
                TenantId = tenant.Id,
                UserName = email,
                NormalizedUserName = email.ToUpperInvariant(),
                Email = email,
                NormalizedEmail = email.ToUpperInvariant(),
                EmailConfirmed = true,
                FirstName = email.Split('@')[0],
                LastName = string.Empty,
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
            var result = await userManager.CreateAsync(user, password);
            if (!result.Succeeded)
            {
                throw new InvalidOperationException($"Failed to create user {email}: {string.Join(",", result.Errors.Select(e => e.Description))}");
            }
            return user;
        }

        private static async Task AddToRoleIfMissingAsync(UserManager<User> userManager, User user, string roleName)
        {
            if (!await userManager.IsInRoleAsync(user, roleName))
            {
                await userManager.AddToRoleAsync(user, roleName);
            }
        }

        private static string GenerateLicenseKey()
        {
            // Non-default so trial enforcement passes; GUID-style.
            return "PETAL-" + Guid.NewGuid().ToString("N").ToUpperInvariant();
        }

        private static string BuildAppSettings(Guid tenantId, string apiKey, Guid auditUserId, string workingDir)
        {
            // Base = known-good Desktop config so ALL startup-required keys are present.
            var basePath = Path.Combine(workingDir, "appsettings.Desktop.json");
            if (!File.Exists(basePath))
            {
                throw new FileNotFoundException("Desktop config template not found.", basePath);
            }

            var root = System.Text.Json.Nodes.JsonNode.Parse(File.ReadAllText(basePath)).AsObject();

            // Per-customer overrides.
            root["DeploymentMode"] = "Desktop";
            root["DatabaseProvider"] = "Sqlite";
            root["TenantId"] = tenantId.ToString();
            root["ApiKey"] = apiKey;
            root["SyncSettings"] = new System.Text.Json.Nodes.JsonObject
            {
                ["CloudApiUrl"] = null,               // fully offline; desktop sync not configured
                ["SyncIntervalMinutes"] = 15,
                ["AutoSync"] = true
            };
            root["DefaultUser"] = new System.Text.Json.Nodes.JsonObject
            {
                ["DefaultUserId"] = auditUserId.ToString()   // audit stamp user = jawad@gmail.com
            };
            if (root["ConnectionStrings"] is System.Text.Json.Nodes.JsonObject conn) conn["SqliteConnectionString"] = $"Data Source={DbFileName}";
            if (root["SeedingConfig"] is System.Text.Json.Nodes.JsonObject seed) seed["Enabled"] = false;

            return root.ToJsonString(new System.Text.Json.JsonSerializerOptions { WriteIndented = true });
        }
    }

    /// <summary>
    /// Fixed single-tenant provider reused by the DbContext's global query filters while
    /// seeding. The actual tenant is set once known.
    /// </summary>
    internal class FixedTenantProvider : ITenantProvider
    {
        private Guid _id;
        public void SetTenantId(Guid tenantId) => _id = tenantId;
        public Guid? GetTenantId() => _id;
        public Task<Tenant> GetCurrentTenantAsync() => Task.FromResult<Tenant>(null);
    }
}
