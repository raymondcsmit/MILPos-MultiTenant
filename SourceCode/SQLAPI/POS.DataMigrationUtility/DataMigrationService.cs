using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using POS.Data;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Domain;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Reflection;
using System.Threading.Tasks;

namespace POS.DataMigrationUtility
{
    public class DataMigrationService
    {
        private readonly IConfiguration _configuration;
        private readonly MigrationSettings _settings;
        private readonly string _sqlServerConnectionString;
        private readonly string _sqliteConnectionString;

        // Defined in dependency order
        private readonly List<Type> _migrationOrder = new List<Type>
        {
            // 1. Identity & Access Control
            typeof(User),
            typeof(Role),
            typeof(UserClaim),
            typeof(RoleClaim),
            typeof(UserRole),
            typeof(UserLogin),
            typeof(UserToken),

            // 2. Base Lookups
            typeof(Country),
            typeof(Language),
            typeof(Currency),
            typeof(ExpenseCategory),
            typeof(FinancialYear),
            typeof(InquirySource),
            typeof(InquiryStatus),
            typeof(UnitConversation),
            typeof(Tax),
            typeof(Brand),
            typeof(ProductCategory),
            typeof(EmailTemplate),
            typeof(EmailSMTPSetting),
            typeof(POS.Data.Action),
            typeof(POS.Data.Page),
            typeof(PageHelper),
            typeof(NLog),
            typeof(LoginAudit),
            typeof(TableSetting),
            typeof(CompanyProfile),
            typeof(SendEmail),
            typeof(ContactRequest),
            
            // 3. Dependent Lookups
            typeof(City),
            typeof(ContactAddress),
            typeof(SupplierAddress),
            typeof(Location),
            
            // 4. Users & Locations (Junction)
            typeof(UserLocation),
            
            // 5. Main Entities
            typeof(Customer),
            typeof(Supplier),
            typeof(LedgerAccount),
            typeof(Reminder),
            
            // 6. Reminder Details
            typeof(ReminderNotification),
            typeof(ReminderUser),
            typeof(ReminderScheduler),
            typeof(DailyReminder),
            typeof(QuarterlyReminder),
            typeof(HalfYearlyReminder),

            // 7. Products & Inventory
            typeof(Product),
            typeof(ProductTax),
            typeof(Variant),
            typeof(VariantItem),
            typeof(ProductStock),
            
            // 8. Transactions - Inquiries & Expenses
            typeof(Expense),
            typeof(ExpenseTax),
            typeof(Inquiry),
            typeof(InquiryActivity),
            typeof(InquiryAttachment),
            typeof(InquiryNote),
            typeof(InquiryProduct),
            
            // 9. Transactions - Orders & Transfers
            typeof(PurchaseOrder),
            typeof(PurchaseOrderItem),
            typeof(PurchaseOrderItemTax),
            typeof(PurchaseOrderPayment),
            
            typeof(SalesOrder),
            typeof(SalesOrderItem),
            typeof(SalesOrderItemTax),
            typeof(SalesOrderPayment),
            
            typeof(StockTransfer),
            typeof(StockTransferItem),
            typeof(DamagedStock),
            
            // 10. Financial Transactions
            typeof(Transaction),
            typeof(TransactionItem),
            typeof(TransactionItemTax),
            typeof(AccountingEntry),
            typeof(PaymentEntry),
            typeof(TaxEntry),
            typeof(StockAdjustment),
            typeof(CustomerLedger),
            typeof(LoanDetail),
            typeof(LoanRepayment),
            typeof(Payroll),
            
            // 11. Others
            typeof(SendEmail),
            typeof(EmailLog),
            typeof(EmailLogAttachment)
        };

        public DataMigrationService(IConfiguration configuration)
        {
            _configuration = configuration;
            _settings = _configuration.GetSection("MigrationSettings").Get<MigrationSettings>() ?? new MigrationSettings();
            _sqlServerConnectionString = _configuration.GetConnectionString("SqlServerConnection") ?? throw new ArgumentNullException("SqlServerConnection");
            _sqliteConnectionString = _configuration.GetConnectionString("SqliteConnection") ?? throw new ArgumentNullException("SqliteConnection");
        }

        public async Task MigrateDataAsync()
        {
            Console.WriteLine("Starting data migration from SQL Server to SQLite...");
            Console.WriteLine($"Batch Size: {_settings.BatchSize}");
            Console.WriteLine($"Skip Deleted Records: {_settings.SkipDeletedRecords}");

            using var sqlServerContext = CreateSqlServerContext();
            using var sqliteContext = CreateSqliteContext();

            // Ensure SQLite database is created fresh
            Console.WriteLine("Recreating SQLite database...");
            await sqliteContext.Database.EnsureDeletedAsync();
            await sqliteContext.Database.EnsureCreatedAsync();

            // Open connection explicitly to ensure PRAGMA settings persist across commands
            await sqliteContext.Database.OpenConnectionAsync();

            // Disable foreign key constraints temporarily
            await sqliteContext.Database.ExecuteSqlRawAsync("PRAGMA foreign_keys = OFF");

            try
            {
                foreach (var type in _migrationOrder)
                {
                    await MigrateEntityGenericAsync(type, sqlServerContext, sqliteContext);
                }

                // Re-enable foreign key constraints
                await sqliteContext.Database.ExecuteSqlRawAsync("PRAGMA foreign_keys = ON");
                await sqliteContext.Database.CloseConnectionAsync();
                
                Console.WriteLine("Data migration completed successfully!");
                
                // Verification
                await VerifyMigrationAsync(sqlServerContext, sqliteContext);
            }
            catch (Exception ex)
            {
                // Re-enable foreign key constraints even on error
                try 
                {
                    await sqliteContext.Database.ExecuteSqlRawAsync("PRAGMA foreign_keys = ON");
                    await sqliteContext.Database.CloseConnectionAsync();
                }
                catch { /* Ignore errors during cleanup */ }

                Console.WriteLine($"CRITICAL ERROR: {ex.Message}");
                throw;
            }
        }

        private async Task MigrateEntityGenericAsync(Type type, POSDbContext sourceContext, POSDbContext targetContext)
        {
            var method = typeof(DataMigrationService).GetMethod(nameof(MigrateEntitiesAsync), BindingFlags.NonPublic | BindingFlags.Instance);
            var genericMethod = method.MakeGenericMethod(type);
            await (Task)genericMethod.Invoke(this, new object[] { sourceContext, targetContext, null });
        }

        private POSDbContext CreateSqlServerContext()
        {
            var optionsBuilder = new DbContextOptionsBuilder<POSDbContext>();
            optionsBuilder.UseSqlServer(_sqlServerConnectionString);
            // Add NoTracking for performance
            optionsBuilder.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);
            return new POSDbContext(optionsBuilder.Options);
        }

        private POSDbContext CreateSqliteContext()
        {
            var optionsBuilder = new DbContextOptionsBuilder<POSDbContext>();
            optionsBuilder.UseSqlite(_sqliteConnectionString);
            return new POSDbContext(optionsBuilder.Options);
        }

        private IQueryable<T> GetSourceQuery<T>(IQueryable<T> query) where T : class
        {
            if (!_settings.SkipDeletedRecords) return query;

            // Check if T has "IsDeleted" property
            var isDeletedProp = typeof(T).GetProperty("IsDeleted");
            if (isDeletedProp != null && isDeletedProp.PropertyType == typeof(bool))
            {
                // Create expression: x => !x.IsDeleted
                var parameter = Expression.Parameter(typeof(T), "x");
                var property = Expression.Property(parameter, "IsDeleted");
                var notDeleted = Expression.Not(property);
                var lambda = Expression.Lambda<Func<T, bool>>(notDeleted, parameter);
                
                return query.Where(lambda);
            }
            return query;
        }

        private async Task MigrateEntitiesAsync<T>(POSDbContext sourceContext, POSDbContext targetContext, 
            Func<IQueryable<T>, IQueryable<T>>? filter = null) where T : class
        {
            var entityName = typeof(T).Name;
            Console.WriteLine($"Migrating {entityName}...");

            var dbSet = sourceContext.Set<T>();
            var rawCount = await dbSet.CountAsync();
            Console.WriteLine($"Source {entityName} total raw records: {rawCount}");

            var query = dbSet.AsQueryable();
            
            // Apply global filter (IsDeleted)
            query = GetSourceQuery(query);

            if (filter != null)
            {
                query = filter(query);
            }

            var totalCount = await query.CountAsync();
            Console.WriteLine($"Records to migrate after filter: {totalCount}");

            if (totalCount == 0) return;

            var migratedCount = 0;
            var batchCount = 0;
            var pageSize = _settings.BatchSize;
            var pageCount = (int)Math.Ceiling((double)totalCount / pageSize);

            for (int page = 0; page < pageCount; page++)
            {
                try
                {
                    // Use AsNoTracking for read performance
                    var batch = await query.Skip(page * pageSize).Take(pageSize).AsNoTracking().ToListAsync();
                    
                    if (batch.Any())
                    {
                        batchCount++;
                        
                        // AddRange is efficient
                        targetContext.Set<T>().AddRange(batch);
                        await targetContext.SaveChangesAsync();
                        
                        // Detach entities to free memory in context
                        foreach(var entry in targetContext.ChangeTracker.Entries())
                        {
                            entry.State = EntityState.Detached;
                        }

                        migratedCount += batch.Count;
                        Console.WriteLine($"Migrated batch {batchCount}: {migratedCount}/{totalCount} {entityName} records");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error migrating batch {batchCount} of {entityName}: {ex.Message}");
                    if (ex.InnerException != null)
                    {
                        Console.WriteLine($"Inner exception: {ex.InnerException.Message}");
                    }
                    
                    // Fallback: Try inserting one by one to identify the culprit
                    Console.WriteLine("Attempting row-by-row migration for this batch...");
                    
                    // Clear context first to remove failed entities
                    targetContext.ChangeTracker.Clear();
                    
                    // Re-fetch the batch
                    var batch = await query.Skip(page * pageSize).Take(pageSize).AsNoTracking().ToListAsync();
                    foreach (var item in batch)
                    {
                        try
                        {
                            targetContext.Set<T>().Add(item);
                            await targetContext.SaveChangesAsync();
                            targetContext.Entry(item).State = EntityState.Detached;
                            migratedCount++;
                        }
                        catch (Exception innerEx)
                        {
                             Console.WriteLine($"Failed to migrate specific record of {entityName}: {innerEx.Message}");
                             // Log details about item if possible (e.g. Id)
                             targetContext.ChangeTracker.Clear(); // Clear context to remove failed entity
                        }
                    }
                }
            }

            Console.WriteLine($"Completed migrating {migratedCount} {entityName} records");
        }

        private async Task VerifyMigrationAsync(POSDbContext source, POSDbContext target)
        {
            Console.WriteLine("------------------------------------------------");
            Console.WriteLine("VERIFICATION REPORT");
            Console.WriteLine("------------------------------------------------");
            
            var allMatch = true;

            foreach (var type in _migrationOrder)
            {
                var method = typeof(DataMigrationService).GetMethod(nameof(VerifyEntityCountAsync), BindingFlags.NonPublic | BindingFlags.Instance);
                var genericMethod = method.MakeGenericMethod(type);
                var match = await (Task<bool>)genericMethod.Invoke(this, new object[] { source, target });
                if (!match) allMatch = false;
            }

            if (allMatch)
            {
                Console.WriteLine("SUCCESS: All entities have matching record counts.");
            }
            else
            {
                Console.WriteLine("WARNING: Some entities have mismatched record counts.");
            }
        }

        private async Task<bool> VerifyEntityCountAsync<T>(POSDbContext source, POSDbContext target) where T : class
        {
            var entityName = typeof(T).Name;
            var sourceQuery = GetSourceQuery(source.Set<T>().AsQueryable());
            var sourceCount = await sourceQuery.CountAsync();
            var targetCount = await target.Set<T>().CountAsync();

            if (sourceCount == targetCount)
            {
                Console.WriteLine($"[OK] {entityName}: {sourceCount} records");
                return true;
            }
            else
            {
                Console.WriteLine($"[MISMATCH] {entityName}: Source={sourceCount}, Target={targetCount}");
                return false;
            }
        }
    }
}
