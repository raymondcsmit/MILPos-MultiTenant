using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using POS.Data;
using POS.Data.Dto.Tenant;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Domain;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Repository
{
    public class TenantRegistrationService : ITenantRegistrationService
    {
        private readonly POSDbContext _context;
        private readonly IPasswordHasher<User> _passwordHasher;
        private readonly string _seedDataPath;

        public TenantRegistrationService(POSDbContext context, IPasswordHasher<User> passwordHasher)
        {
            _context = context;
            _passwordHasher = passwordHasher;
            _seedDataPath = Path.Combine(AppContext.BaseDirectory, "SeedData");
            if (!Directory.Exists(_seedDataPath))
            {
                // Fallback for dev environment
                _seedDataPath = @"f:\MIllyass\pos-with-inventory-management\SourceCode\SeedData";
            }
        }

        public async Task<Tenant> RegisterTenantAsync(RegisterTenantDto dto)
        {
            // 1. Validation
            if (await _context.Tenants.IgnoreQueryFilters().AnyAsync(t => t.Subdomain == dto.Subdomain))
            {
                throw new Exception("Subdomain already exists.");
            }

            // 2. Create Tenant
            var tenant = new Tenant
            {
                Id = Guid.NewGuid(),
                Name = dto.Name,
                Subdomain = dto.Subdomain,
                ContactEmail = dto.AdminEmail,
                ContactPhone = dto.Phone,
                Address = dto.Address,
                IsActive = true,
                CreatedDate = DateTime.UtcNow,
                SubscriptionPlan = "Trial",
                SubscriptionStartDate = DateTime.UtcNow,
                SubscriptionEndDate = DateTime.UtcNow.AddDays(14),
                MaxUsers = 5,
                BusinessType = dto.BusinessType
            };

            _context.Tenants.Add(tenant);
            await _context.SaveChangesAsync();

            // 3. Create Admin User
            var adminUser = new User
            {
                Id = Guid.NewGuid(),
                TenantId = tenant.Id,
                Email = dto.AdminEmail,
                UserName = dto.AdminEmail,
                NormalizedEmail = dto.AdminEmail.ToUpper(),
                NormalizedUserName= dto.AdminEmail.ToUpper(),
                FirstName = "Admin",
                LastName = "User",
                IsActive = true,
                CreatedDate = DateTime.UtcNow,
                PhoneNumber = dto.Phone,
                IsAllLocations = true
            };

            adminUser.PasswordHash = _passwordHasher.HashPassword(adminUser, string.IsNullOrEmpty(dto.AdminPassword) ? "admin@123" : dto.AdminPassword);

            _context.Users.Add(adminUser);
            await _context.SaveChangesAsync();

            // 4. Seed Data
            await SeedTenantDataAsync(tenant, adminUser);

            return tenant;
        }

        private async Task SeedTenantDataAsync(Tenant tenant, User adminUser)
        {
            await SeedCompanyProfileAsync(tenant, adminUser);
            var roleMap = await SeedRolesAsync(tenant, adminUser);
            await SeedMasterDataAsync(tenant, adminUser);
            await SeedFinancialDataAsync(tenant, adminUser);
        }

        private async Task SeedCompanyProfileAsync(Tenant tenant, User adminUser)
        {
            var companyProfile = new CompanyProfile
            {
                Id = Guid.NewGuid(),
                TenantId = tenant.Id,
                Title = tenant.Name,
                Address = tenant.Address,
                Email = tenant.ContactEmail,
                Phone = tenant.ContactPhone,
                CreatedBy = adminUser.Id,
                CreatedDate = DateTime.UtcNow,
                LicenseKey = "AAABBB",
                PurchaseCode = "CCCCRR"
            };

            _context.CompanyProfiles.Add(companyProfile);
            await _context.SaveChangesAsync();
        }

        private async Task<Dictionary<string, Guid>> SeedRolesAsync(Tenant tenant, User adminUser)
        {
            // Read Roles.csv and Clone
            var roles = ReadCsv<Role>("Roles.csv");
            var roleMap = new Dictionary<string, Guid>(); // OldIdStr -> NewGuid

            foreach (var oldRole in roles)
            {
                var newId = Guid.NewGuid();
                roleMap[oldRole.Id.ToString().ToUpper()] = newId;

                var newRole = new Role
                {
                    Id = newId,
                    TenantId = tenant.Id,
                    Name = oldRole.Name,
                    NormalizedName = oldRole.NormalizedName,
                    IsDeleted = false,
                    CreatedDate = DateTime.UtcNow,
                    CreatedBy = adminUser.Id
                };
                
                _context.Roles.Add(newRole);

                // Assign Admin Role
                if (newRole.Name.Equals("Super Admin", StringComparison.OrdinalIgnoreCase) || 
                    newRole.Name.Equals("Admin", StringComparison.OrdinalIgnoreCase))
                {
                    _context.UserRoles.Add(new UserRole
                    {
                        UserId = adminUser.Id,
                        RoleId = newRole.Id
                    });
                }
            }

            await _context.SaveChangesAsync();

            // Seed Role Claims
            var claims = ReadCsv<RoleClaim>("RoleClaims.csv");
            foreach (var claim in claims)
            {
                if (roleMap.TryGetValue(claim.RoleId.ToString().ToUpper(), out var newRoleId))
                {
                    _context.RoleClaims.Add(new RoleClaim
                    {
                        RoleId = newRoleId,
                        ClaimType = claim.ClaimType,
                        ClaimValue = claim.ClaimValue
                    });
                }
            }
            await _context.SaveChangesAsync();

            return roleMap;
        }

        private async Task SeedMasterDataAsync(Tenant tenant, User adminUser)
        {
            // Taxes
            var taxes = ReadCsv<POS.Data.Tax>("Taxes.csv");
            foreach(var item in taxes)
            {
                item.Id = Guid.NewGuid();
                item.TenantId = tenant.Id;
                item.CreatedBy = adminUser.Id;
                item.CreatedDate = DateTime.UtcNow;
                _context.Taxes.Add(item);
            }

            // Units
            var units = ReadCsv<POS.Data.UnitConversation>("UnitConversations.csv");
            var unitMap = new Dictionary<string, Guid>();
            foreach(var item in units)
            {
                var oldId = item.Id.ToString().ToUpper();
                item.Id = Guid.NewGuid();
                item.TenantId = tenant.Id;
                item.CreatedBy = adminUser.Id;
                item.CreatedDate = DateTime.UtcNow;
                _context.UnitConversations.Add(item);
                unitMap[oldId] = item.Id;
            }

            // Categories
            var cats = ReadCsv<POS.Data.Entities.ProductCategory>("ProductCategories.csv");
            var categoryMap = new Dictionary<string, Guid>();
            foreach(var item in cats)
            {
                var oldId = item.Id.ToString().ToUpper();
                item.Id = Guid.NewGuid();
                item.TenantId = tenant.Id;
                item.CreatedBy = adminUser.Id;
                item.CreatedDate = DateTime.UtcNow;
                _context.ProductCategories.Add(item);
                categoryMap[oldId] = item.Id;
            }
            
            // Expense Categories
            var expCats = ReadCsv<POS.Data.ExpenseCategory>("ExpenseCategories.csv");
            foreach(var item in expCats)
            {
                item.Id = Guid.NewGuid();
                item.TenantId = tenant.Id;
                item.CreatedBy = adminUser.Id;
                item.CreatedDate = DateTime.UtcNow;
                _context.ExpenseCategories.Add(item);
            }
            
            // Main Location
            var location = new Location
            {
                Id = Guid.NewGuid(),
                TenantId = tenant.Id,
                Name = "Main Warehouse",
                Address = tenant.Address,
                CreatedBy = adminUser.Id,
                CreatedDate = DateTime.UtcNow,
                FBRKey = "DEFAULT_KEY",
                POSID = "POS001",
                ApiBaseUrl = "https://esp.fbr.gov.pk:8244/FBR/v1/api/Live/PostData"
            };
            _context.Locations.Add(location);
            
            var mainLocationId = location.Id; // Capture for stocks

            // Link Admin to this location
            _context.UserLocations.Add(new UserLocation
            {
                UserId = adminUser.Id,
                LocationId = location.Id
            });

            await _context.SaveChangesAsync();

            // ---------------------------------------------------------
            // Seed Brands (Missing in original, needed for Products)
            // ---------------------------------------------------------
            var brands = ReadCsv<Brand>("Brands.csv");
            var brandMap = new Dictionary<string, Guid>();
            foreach (var item in brands)
            {
                var oldId = item.Id.ToString().ToUpper();
                item.Id = Guid.NewGuid();
                item.TenantId = tenant.Id;
                item.CreatedBy = adminUser.Id;
                item.CreatedDate = DateTime.UtcNow;
                _context.Brands.Add(item);
                brandMap[oldId] = item.Id;
            }

            // ---------------------------------------------------------
            // Seed Products (Filtered by BusinessType) with Dependencies
            // ---------------------------------------------------------
            var allProducts = ReadCsv<POS.Data.Product>("Products.csv");
            var productMap = new Dictionary<string, Guid>(); // OldId -> NewId
            var seededProducts = new List<Product>();

            string prefix = "";
            if (tenant.BusinessType == "Pharmacy") prefix = "PH";
            else if (tenant.BusinessType == "Petrol") prefix = "PT";
            else prefix = "RT"; // Default to Retail

            foreach (var p in allProducts)
            {
                // Filter logic
                if (string.IsNullOrEmpty(p.Code)) continue;
                if (!p.Code.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) continue;

                var oldId = p.Id.ToString().ToUpper();
                p.Id = Guid.NewGuid();
                p.TenantId = tenant.Id;
                p.CreatedBy = adminUser.Id;
                p.CreatedDate = DateTime.UtcNow;

                // Remap Foreign Keys
                if (p.UnitId != Guid.Empty)
                {
                    if (unitMap.TryGetValue(p.UnitId.ToString().ToUpper(), out var newUnitId))
                    {
                        p.UnitId = newUnitId;
                    }
                    else
                    {
                        // Critical dependency missing
                        throw new Exception($"Missing Unit mapping for Product {p.Name} (Old UnitId: {p.UnitId})");
                    }
                }
                
                if (p.CategoryId != Guid.Empty)
                {
                    if (categoryMap.TryGetValue(p.CategoryId.ToString().ToUpper(), out var newCatId))
                    {
                        p.CategoryId = newCatId;
                    }
                    else
                    {
                        // Critical dependency missing
                        throw new Exception($"Missing Category mapping for Product {p.Name} (Old CategoryId: {p.CategoryId})");
                    }
                }

                if (p.BrandId.HasValue && p.BrandId != Guid.Empty && brandMap.TryGetValue(p.BrandId.Value.ToString().ToUpper(), out var newBrandId))
                {
                    p.BrandId = newBrandId;
                }
                else
                {
                    p.BrandId = null; // Ensure null if not found or empty
                }

                seededProducts.Add(p);
                productMap[oldId] = p.Id;
            }
            
            if (seededProducts.Any())
            {
                _context.Products.AddRange(seededProducts);
            }

            // ---------------------------------------------------------
            // Seed Product Stocks
            // ---------------------------------------------------------
            var allStocks = ReadCsv<POS.Data.Entities.ProductStock>("ProductStocks.csv");
            var seededStocks = new List<ProductStock>();

            foreach (var s in allStocks)
            {
                var oldProdId = s.ProductId.ToString().ToUpper();
                
                // Only seed stock if the product was seeded
                if (productMap.TryGetValue(oldProdId, out var newProdId))
                {
                    s.Id = Guid.NewGuid();
                    s.ProductId = newProdId;
                    s.LocationId = mainLocationId; // Assign to the main location we just created
                    s.ModifiedDate = DateTime.UtcNow;
                    
                    seededStocks.Add(s);
                }
            }

            if (seededStocks.Any())
            {
                _context.ProductStocks.AddRange(seededStocks);
            }

            try 
            {
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                // Log error (simple console for now, or throw with detail)
                throw new Exception($"Seeding failed: {ex.Message} {ex.InnerException?.Message}", ex);
            }
        }

        private async Task SeedFinancialDataAsync(Tenant tenant, User adminUser)
        {
            var year = DateTime.UtcNow.Year;
            var fy = new FinancialYear
            {
                Id = Guid.NewGuid(),
                TenantId = tenant.Id,
                StartDate = new DateTime(year, 1, 1),
                EndDate = new DateTime(year, 12, 31),
                IsClosed = false,
                CreatedBy = adminUser.Id,
                CreatedDate = DateTime.UtcNow
            };
            _context.FinancialYears.Add(fy);

            var accounts = ReadCsv<LedgerAccount>("LedgerAccounts.csv");
            var accountMap = new Dictionary<string, Guid>();
            var newAccounts = new List<LedgerAccount>();

            foreach(var acc in accounts)
            {
                accountMap[acc.Id.ToString().ToUpper()] = Guid.NewGuid();
            }

            foreach(var oldAcc in accounts)
            {
                var newAcc = new LedgerAccount
                {
                    Id = accountMap[oldAcc.Id.ToString().ToUpper()],
                    TenantId = tenant.Id,
                    AccountCode = oldAcc.AccountCode,
                    AccountName = oldAcc.AccountName,
                    AccountType = oldAcc.AccountType,
                    AccountGroup = oldAcc.AccountGroup,
                    OpeningBalance = 0,
                    IsActive = true,
                    IsSystem = oldAcc.IsSystem,
                    CreatedBy = adminUser.Id,
                    CreatedDate = DateTime.UtcNow,
                    ModifiedBy = adminUser.Id,
                    ModifiedDate = DateTime.UtcNow
                };

                if (oldAcc.ParentAccountId.HasValue && accountMap.TryGetValue(oldAcc.ParentAccountId.Value.ToString().ToUpper(), out var newParentId))
                {
                    newAcc.ParentAccountId = newParentId;
                }

                newAccounts.Add(newAcc);
            }
            
            _context.LedgerAccounts.AddRange(newAccounts);
            await _context.SaveChangesAsync();
        }

        private List<T> ReadCsv<T>(string filename) where T : new()
        {
            var path = Path.Combine(_seedDataPath, filename);
            if (!File.Exists(path)) return new List<T>();

            var lines = File.ReadAllLines(path);
            if (lines.Length < 2) return new List<T>();

            var list = new List<T>();
            var headers = ParseCsvLine(lines[0]);
            var properties = typeof(T).GetProperties().ToDictionary(p => p.Name, StringComparer.OrdinalIgnoreCase);

            for (int i = 1; i < lines.Length; i++)
            {
                if (string.IsNullOrWhiteSpace(lines[i])) continue;
                var values = ParseCsvLine(lines[i]);
                var obj = new T();

                for (int j = 0; j < headers.Count && j < values.Count; j++)
                {
                    if (properties.TryGetValue(headers[j], out var prop) && prop.CanWrite)
                    {
                        try
                        {
                            var value = values[j];
                            if (string.IsNullOrWhiteSpace(value)) continue;

                            var targetType = Nullable.GetUnderlyingType(prop.PropertyType) ?? prop.PropertyType;
                            object convertedValue = null;

                             if (targetType == typeof(Guid))
                            {
                                if (Guid.TryParse(value, out var g)) convertedValue = g;
                            }
                            else if (targetType == typeof(DateTime))
                            {
                                if (DateTime.TryParse(value, out var d)) convertedValue = d;
                            }
                            else if (targetType == typeof(bool))
                            {
                                convertedValue = (value == "1" || value.ToLower() == "true");
                            }
                            else if (targetType.IsEnum)
                            {
                                convertedValue = Enum.Parse(targetType, value, true);
                            }
                            else
                            {
                                convertedValue = Convert.ChangeType(value, targetType);
                            }

                            if (convertedValue != null)
                            {
                                prop.SetValue(obj, convertedValue);
                            }
                        }
                        catch { }
                    }
                }
                list.Add(obj);
            }
            return list;
        }

        private List<string> ParseCsvLine(string line)
        {
            var result = new List<string>();
            var current = new StringBuilder();
            bool inQuotes = false;

            for (int i = 0; i < line.Length; i++)
            {
                char c = line[i];
                if (inQuotes)
                {
                    if (c == '"')
                    {
                        if (i + 1 < line.Length && line[i + 1] == '"') { current.Append('"'); i++; }
                        else inQuotes = false;
                    }
                    else current.Append(c);
                }
                else
                {
                    if (c == '"') inQuotes = true;
                    else if (c == ',') { result.Add(current.ToString()); current.Clear(); }
                    else current.Append(c);
                }
            }
            result.Add(current.ToString());
            return result;
        }
    }
}
