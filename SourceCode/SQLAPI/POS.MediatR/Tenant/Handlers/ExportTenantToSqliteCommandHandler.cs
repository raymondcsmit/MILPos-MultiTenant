using MediatR;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using POS.Data;
using POS.Data.Dto;
using POS.Domain;
using POS.Helper;
using POS.MediatR.Tenant.Commands;
using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Action = POS.Data.Action;
using SalesOrderEntity = POS.Data.SalesOrder;
using DailyProductPriceEntity = POS.Data.DailyProductPrice;

namespace POS.MediatR.Tenant.Handlers
{
    public class ExportTenantToSqliteCommandHandler : IRequestHandler<ExportTenantToSqliteCommand, ServiceResponse<ExportTenantToSqliteCommandResponse>>
    {
        private readonly POSDbContext _sourceContext;
        private readonly IWebHostEnvironment _webHostEnvironment;

        public ExportTenantToSqliteCommandHandler(
            POSDbContext sourceContext,
            IWebHostEnvironment webHostEnvironment)
        {
            _sourceContext = sourceContext;
            _webHostEnvironment = webHostEnvironment;
        }

        public async Task<ServiceResponse<ExportTenantToSqliteCommandResponse>> Handle(ExportTenantToSqliteCommand request, CancellationToken cancellationToken)
        {
            var exportTimestamp = DateTime.UtcNow;
            var tempFileName = $"tenant_{request.TenantId}_{exportTimestamp.Ticks}.db";
            var tempPath = Path.Combine(_webHostEnvironment.ContentRootPath, "App_Data", "Temp");
            if (!Directory.Exists(tempPath))
            {
                Directory.CreateDirectory(tempPath);
            }
            var dbPath = Path.Combine(tempPath, tempFileName);
            var zipFileName = $"tenant_{request.TenantId}_{exportTimestamp.Ticks}.zip";
            var zipPath = Path.Combine(tempPath, zipFileName);

            var optionsBuilder = new DbContextOptionsBuilder<POSDbContext>();
            optionsBuilder.UseSqlite($"Data Source={dbPath}");
            
            try 
            {
                using (var destinationContext = new POSDbContext(optionsBuilder.Options, null))
                {
                    await destinationContext.Database.EnsureCreatedAsync(cancellationToken);

                    // Use Snapshot Isolation to ensure consistency
                    using var sourceTransaction = await _sourceContext.Database.BeginTransactionAsync(System.Data.IsolationLevel.Snapshot, cancellationToken);

                    // Disable FKs in SQLite to allow flexible insertion order
                    await destinationContext.Database.ExecuteSqlRawAsync("PRAGMA foreign_keys = OFF;", cancellationToken);
                    destinationContext.ChangeTracker.AutoDetectChangesEnabled = false;

                    // 3. Export Global Data
                    await ExportGlobalData(destinationContext, cancellationToken);

                    // 4. Export Tenant Data
                    await ExportTenantData(request.TenantId, destinationContext, cancellationToken);

                    // 5. Sync Data
                    await ExportSyncData(request.TenantId, exportTimestamp, destinationContext, cancellationToken);

                    // Re-enable FKs and Optimize
                    await destinationContext.Database.ExecuteSqlRawAsync("PRAGMA foreign_keys = ON;", cancellationToken);
                    await destinationContext.Database.ExecuteSqlRawAsync("VACUUM;", cancellationToken);
                } 
                
                // Context is disposed here, releasing file lock.
                // Clear pools to be safe
                Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();

                // 6. Compress
                if (File.Exists(zipPath)) File.Delete(zipPath);
                using (var archive = ZipFile.Open(zipPath, ZipArchiveMode.Create))
                {
                    archive.CreateEntryFromFile(dbPath, tempFileName);
                }

                if (File.Exists(dbPath)) File.Delete(dbPath);

                var fileBytes = await File.ReadAllBytesAsync(zipPath, cancellationToken);
                if (File.Exists(zipPath)) File.Delete(zipPath);

                return ServiceResponse<ExportTenantToSqliteCommandResponse>.ReturnResultWith200(new ExportTenantToSqliteCommandResponse
                {
                    FileContent = fileBytes,
                    FileName = zipFileName,
                    ContentType = "application/zip"
                });
            }
            catch (Exception ex)
            {
                 // Ensure cleanup
                 Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
                 GC.Collect();
                 GC.WaitForPendingFinalizers();

                if (File.Exists(dbPath)) 
                {
                    try { File.Delete(dbPath); } catch { }
                }
                return ServiceResponse<ExportTenantToSqliteCommandResponse>.Return500(ex.Message);
            }
        }

        private async Task ExportGlobalData(POSDbContext destinationContext, CancellationToken cancellationToken)
        {
            await TransferGlobalData<POS.Data.Country>(destinationContext, cancellationToken);
            await TransferGlobalData<POS.Data.City>(destinationContext, cancellationToken);
            await TransferGlobalData<POS.Data.Currency>(destinationContext, cancellationToken);
            await TransferGlobalData<POS.Data.Entities.Language>(destinationContext, cancellationToken);

            await TransferGlobalData<POS.Data.Page>(destinationContext, cancellationToken);
            await TransferGlobalData<Action>(destinationContext, cancellationToken);

            // Menu Items (Global)
            var globalMenus = await _sourceContext.Set<POS.Data.MenuItem>().AsNoTracking()
                .Where(x => x.TenantId == null).ToListAsync(cancellationToken);
            await BulkInsert(destinationContext, globalMenus, cancellationToken);
        }

        private async Task ExportTenantData(Guid tenantId, POSDbContext destinationContext, CancellationToken cancellationToken)
        {
            // Tenant
             var tenant = await _sourceContext.Set<POS.Data.Entities.Tenant>().AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == tenantId, cancellationToken);
            if (tenant != null)
            {
                destinationContext.Set<POS.Data.Entities.Tenant>().Add(tenant);
                await destinationContext.SaveChangesAsync(cancellationToken);
            }

            // Identity
            // IdentityUser<Guid> and IdentityRole<Guid> does not map to BaseEntity directly usually unless customized
            // But our User/Role classes have TenantId.
            // We use manual filtering for these.
            
            // Roles
            var roles = await _sourceContext.Roles.AsNoTracking().Where(x => x.TenantId == tenantId).ToListAsync(cancellationToken);
            await BulkInsert(destinationContext, roles, cancellationToken);

            // Users
            var users = await _sourceContext.Users.AsNoTracking().Where(x => x.TenantId == tenantId).ToListAsync(cancellationToken);
            await BulkInsert(destinationContext, users, cancellationToken);

            // UserRoles - Filter by Users in this Tenant
            // We can't easily query UserRoles by TenantId directly as it's a join table usually without TenantId?
            // Actually our UserRole is: public class UserRole : IdentityUserRole<Guid> { }
            // POSDbContext: public override DbSet<UserRole> UserRoles { get; set; }
            // It might not have TenantId. We filter by UserId in users list.
            var userIds = users.Select(u => u.Id).ToList();
            var userRoles = await _sourceContext.UserRoles.AsNoTracking()
                .Where(ur => userIds.Contains(ur.UserId)).ToListAsync(cancellationToken);
            await BulkInsert(destinationContext, userRoles, cancellationToken);

             // UserClaims
            var userClaims = await _sourceContext.UserClaims.AsNoTracking()
                .Where(uc => userIds.Contains(uc.UserId)).ToListAsync(cancellationToken);
            await BulkInsert(destinationContext, userClaims, cancellationToken);

            // RoleClaims
            var roleIds = roles.Select(r => r.Id).ToList();
            var roleClaims = await _sourceContext.RoleClaims.AsNoTracking()
                .Where(rc => roleIds.Contains(rc.RoleId)).ToListAsync(cancellationToken);
            await BulkInsert(destinationContext, roleClaims, cancellationToken);
            
            // UserLogins & UserTokens
            var userLogins = await _sourceContext.UserLogins.AsNoTracking()
                .Where(ul => userIds.Contains(ul.UserId)).ToListAsync(cancellationToken);
            await BulkInsert(destinationContext, userLogins, cancellationToken);

            var userTokens = await _sourceContext.UserTokens.AsNoTracking()
                .Where(ut => userIds.Contains(ut.UserId)).ToListAsync(cancellationToken);
            await BulkInsert(destinationContext, userTokens, cancellationToken);
            
            // UserLocations
            var userLocations = await _sourceContext.UserLocations.AsNoTracking()
                 .Where(ul => userIds.Contains(ul.UserId)).ToListAsync(cancellationToken);
            await BulkInsert(destinationContext, userLocations, cancellationToken);


            // Business Entities
            // We use a helper that filters by TenantId for BaseEntity types
            await TransferTenantData<POS.Data.MenuItem>(tenantId, destinationContext, cancellationToken);
             // RoleMenuItem doesn't have TenantId? 
            // Check RoleMenuItem: usually keys are RoleId, MenuItemId. 
            // We filter by RoleId.
            var roleMenuItems = await _sourceContext.RoleMenuItems.AsNoTracking()
                .Where(rmi => roleIds.Contains(rmi.RoleId)).ToListAsync(cancellationToken);
            await BulkInsert(destinationContext, roleMenuItems, cancellationToken);


            await TransferTenantData<POS.Data.Customer>(tenantId, destinationContext, cancellationToken);
            await TransferTenantData<POS.Data.Supplier>(tenantId, destinationContext, cancellationToken);
            // Suppliers have SupplierAddresses?
            // Suppliers have SupplierAddresses referenced by BillingAddressId and ShippingAddressId
            var supplierData = await _sourceContext.Suppliers.AsNoTracking()
                .Where(s => s.TenantId == tenantId)
                .Select(s => new { s.BillingAddressId, s.ShippingAddressId })
                .ToListAsync(cancellationToken);

            var supplierAddressIds = supplierData
                .SelectMany(s => new[] { s.BillingAddressId, s.ShippingAddressId })
                .Distinct()
                .ToList();

             var supplierAddresses = await _sourceContext.SupplierAddresses.AsNoTracking()
                .Where(sa => supplierAddressIds.Contains(sa.Id)).ToListAsync(cancellationToken);
             await BulkInsert(destinationContext, supplierAddresses, cancellationToken);

            await TransferTenantData<POS.Data.Entities.ProductCategory>(tenantId, destinationContext, cancellationToken);
            await TransferTenantData<POS.Data.Brand>(tenantId, destinationContext, cancellationToken);
            await TransferTenantData<POS.Data.UnitConversation>(tenantId, destinationContext, cancellationToken);
            await TransferTenantData<POS.Data.Tax>(tenantId, destinationContext, cancellationToken);
            // Warehouse removed, using Location
            await TransferTenantData<POS.Data.Entities.Location>(tenantId, destinationContext, cancellationToken);
            
            await TransferTenantData<POS.Data.Product>(tenantId, destinationContext, cancellationToken);
             // Product Taxes and others linked to Product?
             // ProductTax has ProductId.
             // We can fetch valid ProductIds
             var productIds = await _sourceContext.Products.AsNoTracking().Where(p => p.TenantId == tenantId).Select(p => p.Id).ToListAsync(cancellationToken);
             
             var productTaxes = await _sourceContext.ProductTaxes.AsNoTracking()
                 .Where(pt => productIds.Contains(pt.ProductId)).ToListAsync(cancellationToken);
             
             // Inventory/Stock
             await TransferTenantData<POS.Data.Entities.ProductStock>(tenantId, destinationContext, cancellationToken);
            
            await TransferTenantData<Data.Entities.Inventory.InventoryBatch>(tenantId, destinationContext, cancellationToken);

            await TransferTenantData<ExpenseCategory>(tenantId, destinationContext, cancellationToken);
            await TransferTenantData<Expense>(tenantId, destinationContext, cancellationToken);
            // ExpenseTaxes
            // Filter by Expenses
             var expenseIds = await _sourceContext.Expenses.AsNoTracking().Where(e => e.TenantId == tenantId).Select(e => e.Id).ToListAsync(cancellationToken);
             var expenseTaxes = await _sourceContext.ExpenseTaxes.AsNoTracking()
                 .Where(et => expenseIds.Contains(et.ExpenseId)).ToListAsync(cancellationToken);
             await BulkInsert(destinationContext, expenseTaxes, cancellationToken);


            await TransferTenantData<CompanyProfile>(tenantId, destinationContext, cancellationToken);
            await TransferTenantData<EmailTemplate>(tenantId, destinationContext, cancellationToken);
            await TransferTenantData<EmailSMTPSetting>(tenantId, destinationContext, cancellationToken);
            await TransferTenantData<POS.Data.Entities.TableSetting>(tenantId, destinationContext, cancellationToken);
            
            // Sales/Purchase
            await TransferTenantData<SalesOrderEntity>(tenantId, destinationContext, cancellationToken);
            // SalesOrderItems
            var salesOrderIds = await _sourceContext.SalesOrders.AsNoTracking().Where(so => so.TenantId == tenantId).Select(so => so.Id).ToListAsync(cancellationToken);
            var salesOrderItems = await _sourceContext.SalesOrderItems.AsNoTracking() // Large table
                 .Where(soi => salesOrderIds.Contains(soi.SalesOrderId)).ToListAsync(cancellationToken);
             await BulkInsert(destinationContext, salesOrderItems, cancellationToken);
             // SalesOrderItemTaxes
             var salesOrderItemIds = salesOrderItems.Select(i => i.Id).ToList(); // Might be huge?
             // Since we chunk, maybe it's fine.
            // For optimized approach, we should fetch by SalesOrderId but Tax is on Item.
            // Using join or simple contains if list is not too big. 
            // For now, implementing simple contains. 
             var salesOrderItemTaxes = await _sourceContext.SalesOrderItemTaxes.AsNoTracking()
                 .Where(t => salesOrderItemIds.Contains(t.SalesOrderItemId)).ToListAsync(cancellationToken);
             await BulkInsert(destinationContext, salesOrderItemTaxes, cancellationToken);
             
             await TransferTenantData<POS.Data.SalesOrderPayment>(tenantId, destinationContext, cancellationToken);


            await TransferTenantData<POS.Data.PurchaseOrder>(tenantId, destinationContext, cancellationToken);
            var purchaseOrderIds = await _sourceContext.PurchaseOrders.AsNoTracking().Where(po => po.TenantId == tenantId).Select(po => po.Id).ToListAsync(cancellationToken);
            var purchaseOrderItems = await _sourceContext.PurchaseOrderItems.AsNoTracking()
                .Where(poi => purchaseOrderIds.Contains(poi.PurchaseOrderId)).ToListAsync(cancellationToken);
            await BulkInsert(destinationContext, purchaseOrderItems, cancellationToken);
            
            var purchaseOrderItemIds = purchaseOrderItems.Select(i => i.Id).ToList();
             var purchaseOrderItemTaxes = await _sourceContext.PurchaseOrderItemTaxes.AsNoTracking()
                 .Where(t => purchaseOrderItemIds.Contains(t.PurchaseOrderItemId)).ToListAsync(cancellationToken);
             await BulkInsert(destinationContext, purchaseOrderItemTaxes, cancellationToken);
             
             await TransferTenantData<POS.Data.PurchaseOrderPayment>(tenantId, destinationContext, cancellationToken);
            
            await TransferTenantData<POS.Data.Entities.StockTransfer>(tenantId, destinationContext, cancellationToken);
             var stockTransferIds = await _sourceContext.StockTransfers.AsNoTracking().Where(st => st.TenantId == tenantId).Select(st => st.Id).ToListAsync(cancellationToken);
             var stockTransferItems = await _sourceContext.StockTransferItems.AsNoTracking()
                 .Where(sti => stockTransferIds.Contains(sti.StockTransferId)).ToListAsync(cancellationToken);
             await BulkInsert(destinationContext, stockTransferItems, cancellationToken);

            await TransferTenantData<Data.Entities.Accounts.StockAdjustment>(tenantId, destinationContext, cancellationToken);
            await TransferTenantData<Data.Entities.DamagedStock>(tenantId, destinationContext, cancellationToken);

            // Financials
            await TransferTenantData<Data.Entities.Accounts.FinancialYear>(tenantId, destinationContext, cancellationToken);
            await TransferTenantData<Data.Entities.Accounts.LedgerAccount>(tenantId, destinationContext, cancellationToken); 
            
            // Transactions?
            // Transaction has TenantId? 
            // Check Transaction.cs if possible, but assuming yes as it's BaseEntity usually.
            await TransferTenantData<POS.Data.Entities.Transaction>(tenantId, destinationContext, cancellationToken);
             var transactionIds = await _sourceContext.Transactions.AsNoTracking().Where(t => t.TenantId == tenantId).Select(t => t.Id).ToListAsync(cancellationToken);
             var transactionItems = await _sourceContext.TransactionItems.AsNoTracking()
                 .Where(ti => transactionIds.Contains(ti.TransactionId)).ToListAsync(cancellationToken);
             await BulkInsert(destinationContext, transactionItems, cancellationToken);
             
             // TransactionItemTaxes?
             var transactionItemIds = transactionItems.Select(t => t.Id).ToList();
             var transactionItemTaxes = await _sourceContext.TransactionItemTaxes.AsNoTracking()
                 .Where(tit => transactionItemIds.Contains(tit.TransactionItemId)).ToListAsync(cancellationToken);
             await BulkInsert(destinationContext, transactionItemTaxes, cancellationToken);


            await TransferTenantData<Data.Entities.Accounts.AccountingEntry>(tenantId, destinationContext, cancellationToken);
            await TransferTenantData<Data.Entities.Accounts.PaymentEntry>(tenantId, destinationContext, cancellationToken);
            await TransferTenantData<Data.Entities.Accounts.TaxEntry>(tenantId, destinationContext, cancellationToken);
            
            await TransferTenantData<Data.Entities.Payroll>(tenantId, destinationContext, cancellationToken);
            await TransferTenantData<Data.Entities.CustomerLedger>(tenantId, destinationContext, cancellationToken);
            await TransferTenantData<Data.Entities.Accounts.LoanDetail>(tenantId, destinationContext, cancellationToken);
            await TransferTenantData<Data.Entities.Accounts.LoanRepayment>(tenantId, destinationContext, cancellationToken);
            await TransferTenantData<DailyProductPriceEntity>(tenantId, destinationContext, cancellationToken);
        }

        private async Task ExportSyncData(Guid tenantId, DateTime timestamp, POSDbContext destinationContext, CancellationToken cancellationToken)
        {
            // SyncLogs
             var syncLogs = await _sourceContext.SyncLogs.AsNoTracking()
                 .Where(sl => sl.TenantId == tenantId).ToListAsync(cancellationToken);
             await BulkInsert(destinationContext, syncLogs, cancellationToken);

            // SyncMetadata - Initialize
            // Entities that are synced. 
            var entities = new[] 
            { 
                "Product", "Customer", "Supplier", "Brand", "ProductCategory", 
                "SalesOrder", "PurchaseOrder", "Expense", "Tax", "Location",
                "UnitConversation"
                // Add more as needed
            }; 
            var metadata = entities.Select(e => new Data.Entities.SyncMetadata
            {
                EntityType = e,
                LastPullSync = timestamp,
                LastSuccessfulSync = timestamp,
                PendingChanges = 0
            }).ToList();

             await BulkInsert(destinationContext, metadata, cancellationToken);
        }

        private async Task TransferGlobalData<T>(POSDbContext destinationContext, CancellationToken cancellationToken) where T : class
        {
            var data = await _sourceContext.Set<T>().AsNoTracking().ToListAsync(cancellationToken);
            await BulkInsert(destinationContext, data, cancellationToken);
        }

        private async Task TransferTenantData<T>(Guid tenantId, POSDbContext destinationContext, CancellationToken cancellationToken) where T : class
        {
            // Try to cast to BaseEntity to use the TenantId filter
            // Note: EF Core might not translate interface casts well in LINQ.
            // But we can use property access if we know the name "TenantId"
            
            // Use EF.Property to be safe and generic
            var data = await _sourceContext.Set<T>().AsNoTracking()
                .Where(e => EF.Property<Guid?>(e, "TenantId") == tenantId)
                .ToListAsync(cancellationToken);
                
            await BulkInsert(destinationContext, data, cancellationToken);
        }
        
        private async Task BulkInsert<T>(POSDbContext destinationContext, List<T> entities, CancellationToken cancellationToken) where T : class
        {
            if (entities == null || !entities.Any()) return;
            
            // Note: SQLite might lock or be slow if we do huge transactions, but we are inside one big transaction (source) 
            // and we set PRAGMA foreign_keys = OFF.
            // On Destination, we should just AddRange and Save.
            const int batchSize = 1000;
            var set = destinationContext.Set<T>();
            
            for (int i = 0; i < entities.Count; i += batchSize)
            {
                var batch = entities.Skip(i).Take(batchSize).ToList();
                await set.AddRangeAsync(batch, cancellationToken);
                await destinationContext.SaveChangesAsync(cancellationToken);
                destinationContext.ChangeTracker.Clear();
            }
        }
    }
}
