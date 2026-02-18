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
using System.Text;
using System.Threading.Tasks;
using POS.Common.Services;

namespace POS.Repository
{
    public class TenantRegistrationService : ITenantRegistrationService
    {
        private readonly POSDbContext _context;
        private readonly ITenantDataCloner _tenantDataCloner;
        private readonly Microsoft.Extensions.Options.IOptions<POS.Data.Dto.MasterTenantSettings> _masterTenantSettings;
        private readonly ICsvParserService _csvParserService;
        private readonly string _seedDataPath;

        public TenantRegistrationService(
            POSDbContext context, 
            ITenantDataCloner tenantDataCloner, 
            Microsoft.Extensions.Options.IOptions<POS.Data.Dto.MasterTenantSettings> masterTenantSettings,
            ICsvParserService csvParserService)
        {
            _context = context;
            _tenantDataCloner = tenantDataCloner;
            _masterTenantSettings = masterTenantSettings;
            _csvParserService = csvParserService;
            _seedDataPath = Path.Combine(AppContext.BaseDirectory, AppConstants.Seeding.SeedDataFolder);
            
            if (!Directory.Exists(_seedDataPath))
            {
                string root = AppContext.BaseDirectory;
                while (!Directory.Exists(Path.Combine(root, AppConstants.Seeding.SeedDataFolder)) && Directory.GetParent(root) != null)
                {
                    root = Directory.GetParent(root).FullName;
                }
                var candidate = Path.Combine(root, AppConstants.Seeding.SeedDataFolder);
                if (Directory.Exists(candidate)) _seedDataPath = candidate;
            }
        }

        public async Task SeedTenantDataAsync(POS.Data.Entities.Tenant tenant, User adminUser)
        {
            var masterSettings = _masterTenantSettings.Value;
            bool isMaster = (tenant.Subdomain == masterSettings.SubDomain || tenant.Id == masterSettings.TenantId);
            
            if (!isMaster)
            {
                 var masterInDb = await _context.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == masterSettings.TenantId || t.Subdomain == masterSettings.SubDomain);
                 if (masterInDb != null)
                 {
                      await _tenantDataCloner.CloneTenantDataAsync(masterInDb.Id, tenant);
                      return; 
                 }
            }

            var globalIdMap = new Dictionary<string, Guid>();
            await SeedCompanyProfileAsync(tenant, adminUser);
            var roleMap = await SeedRolesAsync(tenant, adminUser);
            foreach (var kvp in roleMap) globalIdMap[kvp.Key] = kvp.Value;
            
            var mainLocationId = await EnsureMainLocationAsync(tenant, adminUser);
            await SeedTenantTableAsync<Location>("Locations.csv", tenant, adminUser, globalIdMap);

            await SeedTenantTableAsync<FinancialYear>("FinancialYears.csv", tenant, adminUser, globalIdMap);
            await EnsureCurrentFinancialYearAsync(tenant, adminUser);
            await SeedTenantTableAsync<LedgerAccount>("LedgerAccounts.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<Tax>("Taxes.csv", tenant, adminUser, globalIdMap);

            await SeedTenantTableAsync<UnitConversation>("UnitConversations.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<Brand>("Brands.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<ProductCategory>("ProductCategories.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<ExpenseCategory>("ExpenseCategories.csv", tenant, adminUser, globalIdMap);

            await SeedTenantTableAsync<EmailTemplate>("EmailTemplates.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<EmailSMTPSetting>("EmailSMTPSettings.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<Data.Action>("Actions.csv", tenant, adminUser, globalIdMap);
            await SeedRoleClaimsAsync(roleMap, globalIdMap);
            await SeedTenantTableAsync<Page>("Pages.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<PageHelper>("Pagehelpers.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<InquiryStatus>("InquiryStatuses.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<InquirySource>("InquirySources.csv", tenant, adminUser, globalIdMap);

            await SeedTenantTableAsync<Supplier>("Suppliers.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<SupplierAddress>("SupplierAddresses.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<Customer>("Customers.csv", tenant, adminUser, globalIdMap);
            await SeedTenantTableAsync<ContactAddress>("ContactAddresses.csv", tenant, adminUser, globalIdMap);

            await SeedProductsAsync(tenant, adminUser, globalIdMap, mainLocationId);
            await SeedTenantTableAsync<ProductTax>("ProductTaxes.csv", tenant, adminUser, globalIdMap);

            // Transactions
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

            await SeedMenuItemsAsync(tenant, adminUser, roleMap);
        }

        private async Task SeedTenantTableAsync<T>(string fileName, POS.Data.Entities.Tenant tenant, User adminUser, Dictionary<string, Guid> globalIdMap) where T : class, new()
        {
            var filePath = Path.Combine(_seedDataPath, fileName);
            var items = await _csvParserService.ReadCsvAsync<T>(filePath);
            if (!items.Any()) return;

            var entityType = typeof(T);
            var idProp = entityType.GetProperty("Id");
            var parentIdProp = entityType.GetProperty("ParentId") ?? entityType.GetProperty("ParentAccountId");
            var tenantIdProp = entityType.GetProperty("TenantId");
            var createdByProp = entityType.GetProperty("CreatedBy");
            var createdDateProp = entityType.GetProperty("CreatedDate");

            if (idProp == null || idProp.PropertyType != typeof(Guid)) return;

            // Pass 1: Generate New IDs and Map
            foreach (var item in items)
            {
                var oldIdVal = idProp.GetValue(item);
                if (oldIdVal is Guid oldId)
                {
                    var newId = Guid.NewGuid();
                    idProp.SetValue(item, newId);
                    globalIdMap[oldId.ToString().ToUpper()] = newId;
                }
            }

            // Pass 2: Set Tenant/Audit Props and Fix FKs
            foreach (var item in items)
            {
                if (tenantIdProp != null) tenantIdProp.SetValue(item, tenant.Id);
                if (createdByProp != null) createdByProp.SetValue(item, adminUser.Id);
                if (createdDateProp != null) createdDateProp.SetValue(item, DateTime.UtcNow);

                if (parentIdProp != null)
                {
                    var parentVal = parentIdProp.GetValue(item);
                    if (parentVal != null)
                    {
                        if (globalIdMap.TryGetValue(parentVal.ToString().ToUpper(), out var newParentId))
                            parentIdProp.SetValue(item, newParentId);
                        else
                            parentIdProp.SetValue(item, null);
                    }
                }

                var props = entityType.GetProperties();
                foreach (var prop in props)
                {
                    if (prop.Name == "Id" || prop.Name == "TenantId" || prop.Name == "CreatedBy" || prop.Name == "ModifiedBy" || prop.Name == "DeletedBy") continue;

                    if ((prop.PropertyType == typeof(Guid) || prop.PropertyType == typeof(Guid?)) && prop.Name.EndsWith("Id"))
                    {
                        var val = prop.GetValue(item);
                        if (val != null && globalIdMap.TryGetValue(val.ToString().ToUpper(), out var newId))
                            prop.SetValue(item, newId);
                    }
                }
                _context.Set<T>().Add(item);
            }
            await _context.SaveChangesAsync();
        }

        private async Task SeedMenuItemsAsync(POS.Data.Entities.Tenant tenant, User adminUser, Dictionary<string, Guid> roleMap)
        {
            var filePath = Path.Combine(_seedDataPath, "MenuItems.csv");
            var menuItems = await _csvParserService.ReadCsvAsync<MenuItem>(filePath);
            var menuMap = new Dictionary<string, Guid>();

            foreach (var item in menuItems)
            {
                var oldId = item.Id.ToString().ToUpper();
                var newId = Guid.NewGuid();
                menuMap[oldId] = newId;
                item.Id = newId; 
            }

            foreach (var item in menuItems)
            {
                item.TenantId = tenant.Id;
                item.CreatedBy = adminUser.Id;
                item.CreatedDate = DateTime.UtcNow;

                if (item.ParentId.HasValue && item.ParentId != Guid.Empty)
                {
                    if (menuMap.TryGetValue(item.ParentId.Value.ToString().ToUpper(), out var newParentId))
                        item.ParentId = newParentId;
                    else
                        item.ParentId = null;
                }
                _context.MenuItems.Add(item);
            }
            await _context.SaveChangesAsync();

            var superAdminRoleId = await _context.Roles
                .Where(r => r.TenantId == tenant.Id && r.Name == "Super Admin")
                .Select(r => r.Id)
                .FirstOrDefaultAsync();

            if (superAdminRoleId != Guid.Empty)
            {
                var roleMenuItems = menuMap.Values.Select(menuId => new RoleMenuItem
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
                }).ToList();

                _context.RoleMenuItems.AddRange(roleMenuItems);
                await _context.SaveChangesAsync();
            }
        }

        private async Task SeedCompanyProfileAsync(POS.Data.Entities.Tenant tenant, User adminUser)
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
            await _context.SaveChangesAsync();
        }

        private async Task<Dictionary<string, Guid>> SeedRolesAsync(POS.Data.Entities.Tenant tenant, User adminUser)
        {
            var roles = await _context.Roles.IgnoreQueryFilters().Where(r => r.TenantId == Guid.Empty).ToListAsync();
            if (!roles.Any())
            {
                var filePath = Path.Combine(_seedDataPath, "Roles.csv");
                roles = await _csvParserService.ReadCsvAsync<Role>(filePath);
            }

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
                    NormalizedName = !string.IsNullOrWhiteSpace(oldRole.NormalizedName) ? oldRole.NormalizedName : oldRole.Name.ToUpper(),
                    IsDeleted = false,
                    CreatedDate = DateTime.UtcNow,
                    CreatedBy = adminUser.Id,
                    ModifiedDate = DateTime.UtcNow,
                    ModifiedBy = adminUser.Id
                };

                _context.Roles.Add(newRole);
                if (newRole.Name.Equals(AppConstants.Roles.Admin, StringComparison.OrdinalIgnoreCase))
                {
                    _context.UserRoles.Add(new UserRole { UserId = adminUser.Id, RoleId = newRole.Id });
                }
            }
            await _context.SaveChangesAsync();
            return roleMap;
        }

        private async Task SeedRoleClaimsAsync(Dictionary<string, Guid> roleMap, Dictionary<string, Guid> globalIdMap)
        {
            var filePath = Path.Combine(_seedDataPath, "RoleClaims.csv");
            var claims = await _csvParserService.ReadCsvAsync<RoleClaim>(filePath);
            var newRoleIds = roleMap.Values.ToList();

            var allNewIds = globalIdMap.Values.ToList();
            var newActions = await _context.Set<POS.Data.Action>().Where(a => allNewIds.Contains(a.Id)).ToListAsync();
            var actionCodeMap = newActions.Where(a => !string.IsNullOrEmpty(a.Code)).ToDictionary(a => a.Code, a => a.Id, StringComparer.OrdinalIgnoreCase);

            var existingClaims = await _context.RoleClaims.Where(rc => newRoleIds.Contains(rc.RoleId)).ToListAsync();

            foreach (var claim in claims)
            {
                if (roleMap.TryGetValue(claim.RoleId.ToString().ToUpper(), out var newRoleId))
                {
                    Guid newActionId = Guid.Empty;
                    var oldActionId = claim.ActionId.ToString().ToUpper();

                    if (globalIdMap.TryGetValue(oldActionId, out var mappedId)) newActionId = mappedId;
                    else if (actionCodeMap.TryGetValue(claim.ClaimType, out var codeMappedId)) newActionId = codeMappedId;

                    if (newActionId != Guid.Empty)
                    {
                        if (!existingClaims.Any(rc => rc.RoleId == newRoleId && rc.ClaimType == claim.ClaimType && rc.ClaimValue == claim.ClaimValue && rc.ActionId == newActionId))
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
            await _context.SaveChangesAsync();
        }

        private async Task<Guid> EnsureMainLocationAsync(POS.Data.Entities.Tenant tenant, User adminUser)
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
            _context.UserLocations.Add(new UserLocation { UserId = adminUser.Id, LocationId = location.Id });
            await _context.SaveChangesAsync();
            return location.Id;
        }

        private async Task EnsureCurrentFinancialYearAsync(POS.Data.Entities.Tenant tenant, User adminUser)
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

        private async Task SeedProductsAsync(POS.Data.Entities.Tenant tenant, User adminUser, Dictionary<string, Guid> globalIdMap, Guid mainLocationId)
        {
            var filePath = Path.Combine(_seedDataPath, "Products.csv");
            var allProducts = await _csvParserService.ReadCsvAsync<POS.Data.Product>(filePath);
            var seededProducts = new List<Product>();
            var productMap = new Dictionary<string, Guid>();

            string prefix = "";
            if (tenant.BusinessType == AppConstants.BusinessType.Pharmacy) prefix = AppConstants.Prefix.Pharmacy;
            else if (tenant.BusinessType == AppConstants.BusinessType.Petrol) prefix = AppConstants.Prefix.Petrol;

            foreach (var p in allProducts)
            {
                if (string.IsNullOrEmpty(p.Code)) continue;
                if (!string.IsNullOrEmpty(prefix) && !p.Code.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) continue;

                var oldId = p.Id.ToString().ToUpper();
                p.Id = Guid.NewGuid();
                p.TenantId = tenant.Id;
                p.CreatedBy = adminUser.Id;
                p.CreatedDate = DateTime.UtcNow;

                if (p.UnitId != Guid.Empty && globalIdMap.TryGetValue(p.UnitId.ToString().ToUpper(), out var newUnitId)) p.UnitId = newUnitId;
                if (p.CategoryId != Guid.Empty && globalIdMap.TryGetValue(p.CategoryId.ToString().ToUpper(), out var newCatId)) p.CategoryId = newCatId;
                if (p.BrandId.HasValue && p.BrandId != Guid.Empty && globalIdMap.TryGetValue(p.BrandId.Value.ToString().ToUpper(), out var newBrandId)) p.BrandId = newBrandId;

                seededProducts.Add(p);
                productMap[oldId] = p.Id;
            }

            if (seededProducts.Any())
            {
                _context.Products.AddRange(seededProducts);
                await _context.SaveChangesAsync();
            }

            var stockFilePath = Path.Combine(_seedDataPath, "ProductStocks.csv");
            var allStocks = await _csvParserService.ReadCsvAsync<POS.Data.Entities.ProductStock>(stockFilePath);
            var seededStocks = new List<ProductStock>();

            foreach (var s in allStocks)
            {
                if (productMap.TryGetValue(s.ProductId.ToString().ToUpper(), out var newProdId))
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
    }
}
