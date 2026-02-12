using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using POS.Common;
using POS.Data;
using POS.Data.Dto.Tenant;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Domain;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace POS.Repository
{
    public class TenantRegistrationService : ITenantRegistrationService
    {
        private readonly POSDbContext _context;
        private readonly UserManager<User> _userManager;
        private readonly string _seedDataPath;

        public TenantRegistrationService(POSDbContext context, UserManager<User> userManager)
        {
            _context = context;
            _userManager = userManager;
            _seedDataPath = Path.Combine(AppContext.BaseDirectory, AppConstants.Seeding.SeedDataFolder);
            if (!Directory.Exists(_seedDataPath))
            {
                // Fallback searching logic
                string root = AppContext.BaseDirectory;
                while (!Directory.Exists(Path.Combine(root, AppConstants.Seeding.SeedDataFolder)) && Directory.GetParent(root) != null)
                {
                    root = Directory.GetParent(root).FullName;
                }
                var candidate = Path.Combine(root, AppConstants.Seeding.SeedDataFolder);
                if (Directory.Exists(candidate)) _seedDataPath = candidate;
                // else _seedDataPath = ...; // Keeping the hardcoded fallback as last resort or move to constants too if strictly needed
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
                SubscriptionPlan = AppConstants.TenantConfig.TrialPlan,
                SubscriptionStartDate = DateTime.UtcNow,
                SubscriptionEndDate = DateTime.UtcNow.AddDays(AppConstants.TenantConfig.TrialPeriodDays),
                MaxUsers = AppConstants.TenantConfig.DefaultMaxUsers,
                BusinessType = dto.BusinessType,
                
                // Auto-generate API key
                ApiKey = GenerateSecureApiKey(),
                ApiKeyCreatedDate = DateTime.UtcNow,
                ApiKeyEnabled = true
            };

            _context.Tenants.Add(tenant);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            { throw new Exception($"SeedRoles failed: {ex}"); }

            // 3. Create Admin User
            var adminUser = new User
            {
                TenantId = tenant.Id,
                Email = dto.AdminEmail,
                UserName = dto.AdminEmail,
                FirstName = "Admin",
                LastName = "User",
                IsActive = true,
                CreatedDate = DateTime.UtcNow,
                PhoneNumber = dto.Phone,
                IsAllLocations = true
            };

            var password = string.IsNullOrEmpty(dto.AdminPassword) ? AppConstants.Seeding.DefaultPassword : dto.AdminPassword;
            var result = await _userManager.CreateAsync(adminUser, password);
            
            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                throw new Exception($"Admin user creation failed: {errors}");
            }

            // 4. Seed Data
            await SeedTenantDataAsync(tenant, adminUser);

            return tenant;
        }

        private async Task SeedTenantDataAsync(Tenant tenant, User adminUser)
        {
            // Global Map to track OldGuid -> NewGuid across all tables for FK resolution
            var globalIdMap = new Dictionary<string, Guid>();

            // 1. Company Profile
            await SeedCompanyProfileAsync(tenant, adminUser);

            // 2. Roles (Special handling for Admin assignment)
            var roleMap = await SeedRolesAsync(tenant, adminUser);
            foreach (var kvp in roleMap) globalIdMap[kvp.Key] = kvp.Value;

            // 3. Generic System Data (Order matters for dependencies)
            // Hierarchy: Countries -> Cities -> Locations
            // Countries and Cities are now Global (SharedBaseEntity) and seeded via SeedingService only.
            
            // Ensure Main Location (Manual)
            var mainLocationId = await EnsureMainLocationAsync(tenant, adminUser);

            // Seed other locations if any (Generic)
            await SeedTenantTableAsync<Location>("Locations.csv", tenant, adminUser, globalIdMap);

            // Financials
            await SeedTenantTableAsync<FinancialYear>("FinancialYears.csv", tenant, adminUser, globalIdMap);
            await EnsureCurrentFinancialYearAsync(tenant, adminUser);
            await SeedTenantTableAsync<LedgerAccount>("LedgerAccounts.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<Tax>("Taxes.csv", tenant, adminUser, globalIdMap);

            // Lookups
            await SeedTenantTableAsync<UnitConversation>("UnitConversations.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<Brand>("Brands.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<ProductCategory>("ProductCategories.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<ExpenseCategory>("ExpenseCategories.csv", tenant, adminUser, globalIdMap);

            // Settings & Permissions
            await SeedTenantTableAsync<EmailTemplate>("EmailTemplates.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<EmailSMTPSetting>("EmailSMTPSettings.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<Data.Action>("Actions.csv", tenant, adminUser, globalIdMap);
            await SeedRoleClaimsAsync(roleMap, globalIdMap);
            await SeedTenantTableAsync<Page>("Pages.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<PageHelper>("Pagehelpers.csv", tenant, adminUser, globalIdMap);
            // Language is now Global (SharedBaseEntity) and seeded via SeedingService only.
            await SeedTenantTableAsync<InquiryStatus>("InquiryStatuses.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<InquirySource>("InquirySources.csv", tenant, adminUser, globalIdMap);

            // CRM / Partners
            await SeedTenantTableAsync<Supplier>("Suppliers.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<SupplierAddress>("SupplierAddresses.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<Customer>("Customers.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<ContactAddress>("ContactAddresses.csv", tenant, adminUser, globalIdMap);

            // 4. Products (Special handling due to filtering and multi-table dependencies)
            await SeedProductsAsync(tenant, adminUser, globalIdMap, mainLocationId);
            
            // Product Taxes (Depends on Products)
            await SeedTenantTableAsync<ProductTax>("ProductTaxes.csv", tenant, adminUser, globalIdMap);

            // Transactions (Depends on Suppliers, Customers, Products, Locations)
            await SeedTenantTableAsync<PurchaseOrder>("PurchaseOrders.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<PurchaseOrderItem>("PurchaseOrderItems.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<PurchaseOrderItemTax>("PurchaseOrderItemTaxes.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<PurchaseOrderPayment>("PurchaseOrderPayments.csv", tenant, adminUser, globalIdMap);
            
            await SeedTenantTableAsync<SalesOrder>("SalesOrders.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<SalesOrderItem>("SalesOrderItems.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<SalesOrderItemTax>("SalesOrderItemTaxes.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<SalesOrderPayment>("SalesOrderPayments.csv", tenant, adminUser, globalIdMap);
            
            await SeedTenantTableAsync<Transaction>("Transactions.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<TransactionItem>("TransactionItems.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<TransactionItemTax>("TransactionItemTaxes.csv", tenant, adminUser, globalIdMap);
            
            await SeedTenantTableAsync<AccountingEntry>("AccountingEntries.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<PaymentEntry>("PaymentEntries.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<TaxEntry>("TaxEntries.csv", tenant, adminUser, globalIdMap);
            
            await SeedTenantTableAsync<StockAdjustment>("StockAdjustments.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<DamagedStock>("DamagedStocks.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<StockTransfer>("StockTransfers.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<StockTransferItem>("StockTransferItems.csv", tenant, adminUser, globalIdMap);
            
            await SeedTenantTableAsync<Expense>("Expenses.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<ExpenseTax>("ExpenseTaxes.csv", tenant, adminUser, globalIdMap);
            
            await SeedTenantTableAsync<LoanDetail>("LoanDetails.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<LoanRepayment>("LoanRepayments.csv", tenant, adminUser, globalIdMap);
            
            // Inquiries / Reminders
            await SeedTenantTableAsync<Inquiry>("Inquiries.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<InquiryProduct>("InquiryProducts.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<InquiryActivity>("InquiryActivities.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<InquiryAttachment>("InquiryAttachments.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<InquiryNote>("InquiryNotes.csv", tenant, adminUser, globalIdMap);
            
            await SeedTenantTableAsync<Reminder>("Reminders.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<ReminderUser>("ReminderUsers.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<ReminderScheduler>("ReminderSchedulers.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<ReminderNotification>("ReminderNotifications.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<DailyReminder>("DailyReminders.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<QuarterlyReminder>("QuarterlyReminders.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<HalfYearlyReminder>("HalfYearlyReminders.csv", tenant, adminUser, globalIdMap);

            // 5. Menu (Special handling for hierarchical remapping)
            await SeedMenuItemsAsync(tenant, adminUser, roleMap);
        }

        private async Task SeedTenantTableAsync<T>(string fileName, Tenant tenant, User adminUser, Dictionary<string, Guid> globalIdMap) where T : class, new()
        {
            var items = ReadCsv<T>(fileName);
            if (!items.Any()) return;

            var entityType = typeof(T);
            var idProp = entityType.GetProperty("Id");
            var parentIdProp = entityType.GetProperty("ParentId") ?? entityType.GetProperty("ParentAccountId");
            var tenantIdProp = entityType.GetProperty("TenantId");
            var createdByProp = entityType.GetProperty("CreatedBy");
            var createdDateProp = entityType.GetProperty("CreatedDate");

            // Skip if no Id property or not a Guid (shouldn't happen for BaseEntity)
            if (idProp == null || idProp.PropertyType != typeof(Guid)) return;

            // Pass 1: Generate New IDs and Map
            foreach (var item in items)
            {
                var oldIdVal = idProp.GetValue(item);
                if (oldIdVal is Guid oldId)
                {
                    var newId = Guid.NewGuid();
                    idProp.SetValue(item, newId);

                    var key = oldId.ToString().ToUpper();
                    globalIdMap[key] = newId;
                }
            }

            // Pass 2: Set Tenant/Audit Props and Fix FKs
            foreach (var item in items)
            {
                if (tenantIdProp != null) tenantIdProp.SetValue(item, tenant.Id);
                if (createdByProp != null) createdByProp.SetValue(item, adminUser.Id);
                if (createdDateProp != null) createdDateProp.SetValue(item, DateTime.UtcNow);

                // Fix Parent ID (Self Referencing)
                if (parentIdProp != null)
                {
                    var parentVal = parentIdProp.GetValue(item);
                    if (parentVal != null)
                    {
                        var key = parentVal.ToString().ToUpper();
                        if (globalIdMap.TryGetValue(key, out var newParentId))
                        {
                            parentIdProp.SetValue(item, newParentId);
                        }
                        else
                        {
                            parentIdProp.SetValue(item, null); // Parent not found (maybe filtered out or missing)
                        }
                    }
                }

                // Fix other FKs (Generic check for Guid properties ending in 'Id')
                var props = entityType.GetProperties();
                foreach (var prop in props)
                {
                    // Skip primary key and audit fields
                    if (prop.Name == "Id" || prop.Name == "TenantId" || prop.Name == "CreatedBy" || prop.Name == "ModifiedBy" || prop.Name == "DeletedBy") continue;

                    if ((prop.PropertyType == typeof(Guid) || prop.PropertyType == typeof(Guid?)) && prop.Name.EndsWith("Id"))
                    {
                        var val = prop.GetValue(item);
                        if (val != null)
                        {
                            var key = val.ToString().ToUpper();
                            if (globalIdMap.TryGetValue(key, out var newId))
                            {
                                prop.SetValue(item, newId);
                            }
                        }
                    }
                }

                _context.Set<T>().Add(item);
            }
            await _context.SaveChangesAsync();
        }

        private async Task SeedMenuItemsAsync(Tenant tenant, User adminUser, Dictionary<string, Guid> roleMap)
        {
            var menuItems = ReadCsv<MenuItem>("MenuItems.csv");
            var menuMap = new Dictionary<string, Guid>(); // OldIdStr -> NewId

            // 1. First pass: Generate New IDs and populate map
            foreach (var item in menuItems)
            {
                var oldId = item.Id.ToString().ToUpper();
                var newId = Guid.NewGuid();
                menuMap[oldId] = newId;
                item.Id = newId; 
            }

            // 2. Second pass: Set properties and fix ParentId
            foreach (var item in menuItems)
            {
                item.TenantId = tenant.Id;
                item.CreatedBy = adminUser.Id;
                item.CreatedDate = DateTime.UtcNow;

                // Remap ParentId
                if (item.ParentId.HasValue && item.ParentId != Guid.Empty)
                {
                    if (menuMap.TryGetValue(item.ParentId.Value.ToString().ToUpper(), out var newParentId))
                    {
                        item.ParentId = newParentId;
                    }
                    else
                    {
                        item.ParentId = null;
                    }
                }

                _context.MenuItems.Add(item);
            }
            await _context.SaveChangesAsync();

            // 3. Assign to Roles (Default Logic)
            var roleMenuItems = new List<RoleMenuItem>();
            var superAdminRoleId = await _context.Roles
                .Where(r => r.TenantId == tenant.Id && r.Name == "Super Admin")
                .Select(r => r.Id)
                .FirstOrDefaultAsync();

            if (superAdminRoleId != Guid.Empty)
            {
                foreach (var menuId in menuMap.Values)
                {
                    roleMenuItems.Add(new RoleMenuItem
                    {
                        Id = Guid.NewGuid(),
                        RoleId = superAdminRoleId,
                        MenuItemId = menuId,
                        CanView = true,
                        CanCreate = true,
                        CanEdit = true,
                        CanDelete = true,
                        AssignedBy = adminUser.Id,
                        AssignedDate = DateTime.UtcNow
                    });
                }
            }

            _context.RoleMenuItems.AddRange(roleMenuItems);
            await _context.SaveChangesAsync();
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
                LicenseKey = AppConstants.Seeding.DefaultLicenseKey,
                PurchaseCode = AppConstants.Seeding.DefaultPurchaseCode
            };

            _context.CompanyProfiles.Add(companyProfile);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            { throw new Exception($"SeedRoles failed: {ex}"); }
        }

        private async Task<Dictionary<string, Guid>> SeedRolesAsync(Tenant tenant, User adminUser)
        {
            var roles = ReadCsv<Role>("Roles.csv");
            var roleMap = new Dictionary<string, Guid>(); 

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
                    CreatedBy = adminUser.Id,
                    ModifiedDate = DateTime.UtcNow,
                    ModifiedBy = adminUser.Id
                };

                _context.Roles.Add(newRole);

                if (newRole.Name.Equals(AppConstants.Roles.SuperAdmin, StringComparison.OrdinalIgnoreCase) ||
                    newRole.Name.Equals(AppConstants.Roles.Admin, StringComparison.OrdinalIgnoreCase))
                {
                    _context.UserRoles.Add(new UserRole
                    {
                        UserId = adminUser.Id,
                        RoleId = newRole.Id
                    });
                }
            }

            await _context.SaveChangesAsync();

            return roleMap;
        }

        private async Task SeedRoleClaimsAsync(Dictionary<string, Guid> roleMap, Dictionary<string, Guid> globalIdMap)
        {
            var claims = ReadCsv<RoleClaim>("RoleClaims.csv");
            var newRoleIds = roleMap.Values.ToList();
            var existingClaims = await _context.RoleClaims
                .Where(rc => newRoleIds.Contains(rc.RoleId))
                .ToListAsync();

            foreach (var claim in claims)
            {
                if (roleMap.TryGetValue(claim.RoleId.ToString().ToUpper(), out var newRoleId))
                {
                    var oldActionId = claim.ActionId.ToString().ToUpper();
                    if (globalIdMap.TryGetValue(oldActionId, out var newActionId))
                    {
                        var exists = existingClaims.Any(rc =>
                            rc.RoleId == newRoleId &&
                            rc.ClaimType == claim.ClaimType &&
                            rc.ClaimValue == claim.ClaimValue &&
                            rc.ActionId == newActionId);

                        if (!exists)
                        {
                            var newClaim = new RoleClaim
                            {
                                RoleId = newRoleId,
                                ClaimType = claim.ClaimType,
                                ClaimValue = claim.ClaimValue,
                                ActionId = newActionId
                            };
                            _context.RoleClaims.Add(newClaim);
                            existingClaims.Add(newClaim);
                        }
                    }
                }
            }
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            { throw new Exception($"SeedRoleClaims failed: {ex}"); }
        }

        private async Task<Guid> EnsureMainLocationAsync(Tenant tenant, User adminUser)
        {
            var location = new Location
            {
                Id = Guid.NewGuid(),
                TenantId = tenant.Id,
                Name = "Main Warehouse",
                Address = tenant.Address,
                CreatedBy = adminUser.Id,
                CreatedDate = DateTime.UtcNow,
                FBRKey = AppConstants.TenantConfig.DefaultFBRKey,
                POSID = AppConstants.TenantConfig.DefaultPOSID,
                ApiBaseUrl = AppConstants.ExternalApis.FbrBaseUrl
            };
            _context.Locations.Add(location);
            
            _context.UserLocations.Add(new UserLocation
            {
                UserId = adminUser.Id,
                LocationId = location.Id
            });

            await _context.SaveChangesAsync();
            return location.Id;
        }

        private async Task EnsureCurrentFinancialYearAsync(Tenant tenant, User adminUser)
        {
            var year = DateTime.UtcNow.Year;
            if (!await _context.FinancialYears.AnyAsync(fy => fy.TenantId == tenant.Id && fy.StartDate.Year == year))
            {
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
                await _context.SaveChangesAsync();
            }
        }

        private async Task SeedProductsAsync(Tenant tenant, User adminUser, Dictionary<string, Guid> globalIdMap, Guid mainLocationId)
        {
            // Seed Products
            var allProducts = ReadCsv<POS.Data.Product>("Products.csv");
            var seededProducts = new List<Product>();
            var productMap = new Dictionary<string, Guid>(); // Old -> New

            string prefix = "";
            if (tenant.BusinessType == AppConstants.BusinessType.Pharmacy) prefix = AppConstants.Prefix.Pharmacy;
            else if (tenant.BusinessType == AppConstants.BusinessType.Petrol) prefix = AppConstants.Prefix.Petrol;
            else prefix = AppConstants.Prefix.Retail; 

            foreach (var p in allProducts)
            {
                if (string.IsNullOrEmpty(p.Code)) continue;
                if (!p.Code.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) continue;

                var oldId = p.Id.ToString().ToUpper();
                p.Id = Guid.NewGuid();
                p.TenantId = tenant.Id;
                p.CreatedBy = adminUser.Id;
                p.CreatedDate = DateTime.UtcNow;

                // Remap FKs using globalIdMap
                if (p.UnitId != Guid.Empty && globalIdMap.TryGetValue(p.UnitId.ToString().ToUpper(), out var newUnitId))
                {
                    p.UnitId = newUnitId;
                }
                
                if (p.CategoryId != Guid.Empty && globalIdMap.TryGetValue(p.CategoryId.ToString().ToUpper(), out var newCatId))
                {
                    p.CategoryId = newCatId;
                }

                if (p.BrandId.HasValue && p.BrandId != Guid.Empty)
                {
                     if (globalIdMap.TryGetValue(p.BrandId.Value.ToString().ToUpper(), out var newBrandId))
                     {
                         p.BrandId = newBrandId;
                     }
                     else
                     {
                         p.BrandId = null;
                     }
                }

                seededProducts.Add(p);
                productMap[oldId] = p.Id;
            }

            if (seededProducts.Any())
            {
                _context.Products.AddRange(seededProducts);
                await _context.SaveChangesAsync();
            }

            // Seed Product Stocks
            var allStocks = ReadCsv<POS.Data.Entities.ProductStock>("ProductStocks.csv");
            var seededStocks = new List<ProductStock>();

            foreach (var s in allStocks)
            {
                var oldProdId = s.ProductId.ToString().ToUpper();
                if (productMap.TryGetValue(oldProdId, out var newProdId))
                {
                    s.Id = Guid.NewGuid();
                    s.ProductId = newProdId;
                    s.LocationId = mainLocationId;
                    s.ModifiedDate = DateTime.UtcNow;
                    seededStocks.Add(s);
                }
            }

            if (seededStocks.Any())
            {
                _context.ProductStocks.AddRange(seededStocks);
                await _context.SaveChangesAsync();
            }
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

        private string GenerateSecureApiKey()
        {
            using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
            var bytes = new byte[32]; // 256 bits
            rng.GetBytes(bytes);
            return Convert.ToBase64String(bytes)
                .Replace("+", "-")
                .Replace("/", "_")
                .TrimEnd('='); // URL-safe base64
        }
    }
}
