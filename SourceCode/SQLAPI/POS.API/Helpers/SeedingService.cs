using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using POS.Data;
using POS.Data.Entities;
using POS.Domain;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace POS.API.Helpers
{
    public class SeedingService
    {
        private readonly POSDbContext _context;

        public SeedingService(POSDbContext context)
        {
            _context = context;
        }

        public async Task SeedAsync()
        {
            try
            {
                // Check if the database is already seeded (Check Tenants)
                if (await _context.Tenants.AnyAsync())
                {
                    Console.WriteLine("Database already seeded (Tenants exist). Skipping data initialization.");
                    return;
                }

                Console.WriteLine("Starting database seeding from CSV files...");

                string seedDataPath = Path.Combine(AppContext.BaseDirectory, "SeedData");
                
                // Fallback searching logic
                if (!Directory.Exists(seedDataPath))
                {
                    var current = new DirectoryInfo(AppContext.BaseDirectory);
                    while (current != null)
                    {
                        var candidate = Path.Combine(current.FullName, "SeedData");
                        if (Directory.Exists(candidate))
                        {
                            seedDataPath = candidate;
                            break;
                        }
                        current = current.Parent;
                    }
                    if (!Directory.Exists(seedDataPath))
                    {
                        seedDataPath = @"f:\MIllyass\pos-with-inventory-management\SourceCode\SeedData";
                    }
                }

                if (!Directory.Exists(seedDataPath))
                {
                     Console.WriteLine($"SeedData directory not found at: {seedDataPath}");
                     return;
                }
                
                Console.WriteLine($"Found SeedData at: {seedDataPath}");

                // Order of seeding is critical for Foreign Keys even if we disable constraints
                var priorityTables = new List<string>
                {
                    "Tenants",
                    "Users", 
                    "Roles",
                    "UserRoles",
                    "RoleClaims",
                    "UserClaims",
                    "UserLogins",
                    "UserTokens",
                    "UserLocations",
                    "CompanyProfiles",
                    "Currencies",
                    "Countries",
                    "Cities",
                    "Locations",
                    "FinancialYears",
                    "LedgerAccounts",
                    "Taxes",
                    "UnitConversations", // Fixed from "Units"
                    "Brands",
                    "ProductCategories",
                    "ExpenseCategories",
                    "Suppliers",
                    "SupplierAddresses",
                    "Customers",
                    "ContactAddresses",
                    "Products",
                    "ProductTaxes",
                    "ProductStocks",
                    "PurchaseOrders",
                    "PurchaseOrderItems",
                    "PurchaseOrderItemTaxes",
                    "PurchaseOrderPayments",
                    "SalesOrders",
                    "SalesOrderItems",
                    "SalesOrderItemTaxes",
                    "SalesOrderPayments",
                    "Transactions",
                    "TransactionItems",
                    "TransactionItemTaxes",
                    "AccountingEntries",
                    "PaymentEntries",
                    "TaxEntries",
                    "StockAdjustments",
                    "DamagedStocks",
                    "StockTransfers",
                    "StockTransferItems",
                    "Expenses",
                    "ExpenseTaxes",
                    "LoanDetails",
                    "LoanRepayments",
                    "InquiryStatuses",
                    "InquirySources",
                    "Inquiries",
                    "InquiryProducts",
                    "InquiryActivities",
                    "InquiryAttachments",
                    "InquiryNotes",
                    "Reminders",
                    "ReminderUsers",
                    "ReminderSchedulers",
                    "ReminderNotifications",
                    "DailyReminders",
                    "QuarterlyReminders",
                    "HalfYearlyReminders",
                    "EmailTemplates",
                    "EmailSMTPSettings",
                    "Actions",
                    "Pages",
                    "Pagehelpers",
                    "Languages"
                };

                // Get all DbSet properties from Context
                var dbSets = _context.GetType().GetProperties()
                    .Where(p => p.PropertyType.IsGenericType && 
                                p.PropertyType.GetGenericTypeDefinition() == typeof(DbSet<>))
                    .ToDictionary(p => p.Name, p => p);

                var csvFiles = Directory.GetFiles(seedDataPath, "*.csv");
                
                // Sort files: Priority first, then others alphabetically
                var sortedFiles = csvFiles.OrderBy(f => {
                    var name = Path.GetFileNameWithoutExtension(f);
                    var index = priorityTables.IndexOf(name);
                    return index == -1 ? int.MaxValue : index;
                }).ThenBy(f => Path.GetFileNameWithoutExtension(f)).ToList();

                // Disable FK constraints if possible (Provider dependent)
                var provider = _context.Database.ProviderName;
                if (provider == "Microsoft.EntityFrameworkCore.Sqlite")
                {
                    await _context.Database.ExecuteSqlRawAsync("PRAGMA foreign_keys = OFF;");
                }
                else if (provider == "Microsoft.EntityFrameworkCore.SqlServer")
                {
                    // Disable all constraints
                    await _context.Database.ExecuteSqlRawAsync("EXEC sp_msforeachtable \"ALTER TABLE ? NOCHECK CONSTRAINT all\"");
                }

                try
                {
                    foreach (var file in sortedFiles)
                    {
                        var tableName = Path.GetFileNameWithoutExtension(file);
                        if (tableName.StartsWith("sqlite") || tableName.StartsWith("__")) continue;

                        if (dbSets.ContainsKey(tableName))
                        {
                            var dbSetProperty = dbSets[tableName];
                            var entityType = dbSetProperty.PropertyType.GetGenericArguments()[0];

                            Console.WriteLine($"Seeding table: {tableName}...");
                            
                            var method = this.GetType().GetMethod(nameof(SeedTable), BindingFlags.NonPublic | BindingFlags.Instance);
                            var genericMethod = method.MakeGenericMethod(entityType);
                            await (Task)genericMethod.Invoke(this, new object[] { file });
                        }
                    }
                }
                finally
                {
                    if (provider == "Microsoft.EntityFrameworkCore.Sqlite")
                    {
                        await _context.Database.ExecuteSqlRawAsync("PRAGMA foreign_keys = ON;");
                    }
                    else if (provider == "Microsoft.EntityFrameworkCore.SqlServer")
                    {
                        await _context.Database.ExecuteSqlRawAsync("EXEC sp_msforeachtable \"ALTER TABLE ? WITH CHECK CHECK CONSTRAINT all\"");
                    }
                }
                
                Console.WriteLine("Database seeding completed successfully.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Seeding Service Failed: {ex.Message}");
                if (ex.InnerException != null) Console.WriteLine($"Inner: {ex.InnerException.Message}");
            }
        }

        private async Task SeedTable<T>(string filePath) where T : class
        {
            var lines = await File.ReadAllLinesAsync(filePath);
            if (lines.Length < 2) return;

            var headerLine = lines[0];
            var headers = ParseCsvLine(headerLine);
            
            var properties = typeof(T).GetProperties()
                .ToDictionary(p => p.Name, p => p, StringComparer.OrdinalIgnoreCase);

            var entities = new List<T>();

            for (int i = 1; i < lines.Length; i++)
            {
                var line = lines[i];
                if (string.IsNullOrWhiteSpace(line)) continue;

                var values = ParseCsvLine(line);
                var entity = Activator.CreateInstance<T>();
                bool hasData = false;

                for (int j = 0; j < headers.Count && j < values.Count; j++)
                {
                    var header = headers[j];
                    var value = values[j];

                    if (properties.TryGetValue(header, out var prop) && prop.CanWrite)
                    {
                        try
                        {
                            if (string.IsNullOrWhiteSpace(value))
                            {
                                var isNullable = Nullable.GetUnderlyingType(prop.PropertyType) != null || !prop.PropertyType.IsValueType;
                                if (isNullable)
                                {
                                    prop.SetValue(entity, null);
                                }
                                else if (prop.PropertyType == typeof(Guid))
                                {
                                    // Don't set Guid.Empty if it's supposed to be null, but since it's not nullable, maybe it's fine
                                    // Leave as default (Guid.Empty)
                                }
                            }
                            else
                            {
                                var targetType = Nullable.GetUnderlyingType(prop.PropertyType) ?? prop.PropertyType;
                                object convertedValue = null;

                                if (targetType == typeof(Guid))
                                {
                                    if (Guid.TryParse(value, out var guid)) convertedValue = guid;
                                    else convertedValue = Guid.Empty;
                                }
                                else if (targetType == typeof(DateTime))
                                {
                                    if (DateTime.TryParse(value, out var dt)) convertedValue = dt;
                                }
                                else if (targetType == typeof(bool))
                                {
                                     if (value == "1" || value.ToLower() == "true") convertedValue = true;
                                     else if (value == "0" || value.ToLower() == "false") convertedValue = false;
                                     else convertedValue = false;
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
                                    prop.SetValue(entity, convertedValue);
                                    hasData = true;
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                           Console.WriteLine($"Error converting {typeof(T).Name}.{header} with value '{value}': {ex.Message}");
                        }
                    }
                }
                
                // Smart Fill logic
                if (entity is Tenant tenant)
                {
                    if (string.IsNullOrEmpty(tenant.Subdomain))
                    {
                        tenant.Subdomain = tenant.Name?.ToLower().Replace(" ", "-") ?? "default";
                    }
                    if (this._defaultTenantId == null || this._defaultTenantId == Guid.Empty) 
                    {
                        this._defaultTenantId = tenant.Id;
                    }
                }
                
                // Auto-fill TenantId property if it exists and is currently Guid.Empty or null
                if (this._defaultTenantId != null && this._defaultTenantId != Guid.Empty)
                {
                    if (properties.TryGetValue("TenantId", out var tenantIdProp) && tenantIdProp.CanWrite)
                    {
                         var val = tenantIdProp.GetValue(entity);
                         if (val == null || (val is Guid g && g == Guid.Empty))
                         {
                             tenantIdProp.SetValue(entity, this._defaultTenantId.Value);
                         }
                    }
                }

                if (hasData) entities.Add(entity);
            }

            if (entities.Any())
            {
                 var provider = _context.Database.ProviderName;
                 var entityType = _context.Model.FindEntityType(typeof(T));
                 var tableName = entityType.GetTableName();
                 var schema = entityType.GetSchema();
                 var fullTableName = string.IsNullOrEmpty(schema) ? $"[{tableName}]" : $"[{schema}].[{tableName}]";

                 bool isSqlServer = provider == "Microsoft.EntityFrameworkCore.SqlServer";
                 
                 // Robust identity check for SQL Server: if it's SQL Server and has an 'Id' property of type int/long
                 // we assume it might be an identity column if we are trying to seed it explicitly.
                 bool hasIdentity = isSqlServer && entityType.GetProperties().Any(p => 
                        (p.Name.Equals("Id", StringComparison.OrdinalIgnoreCase)) && 
                        (p.ClrType == typeof(int) || p.ClrType == typeof(long)));

                 Console.WriteLine($"Table: {tableName}, FullPath: {fullTableName}, HasIdentity: {hasIdentity}");

                 await _context.Database.OpenConnectionAsync();
                 try
                 {
                    if (hasIdentity)
                    {
                        Console.WriteLine($"Executing: SET IDENTITY_INSERT {fullTableName} ON");
                        await _context.Database.ExecuteSqlRawAsync($"SET IDENTITY_INSERT {fullTableName} ON");
                    }

                    var dbSet = _context.Set<T>();
                    await dbSet.AddRangeAsync(entities);
                    await _context.SaveChangesAsync();

                    if (hasIdentity)
                    {
                        await _context.Database.ExecuteSqlRawAsync($"SET IDENTITY_INSERT {fullTableName} OFF");
                    }
                 }
                 catch (Exception ex) 
                 {
                     var innerMessage = ex.InnerException?.Message ?? "No inner exception";
                     Console.WriteLine($"Error batch saving {typeof(T).Name}: {ex.Message}");
                     if (ex.InnerException != null) Console.WriteLine($"Inner Exception: {innerMessage}");

                     if (hasIdentity)
                     {
                         try { await _context.Database.ExecuteSqlRawAsync($"SET IDENTITY_INSERT {fullTableName} OFF"); } catch { }
                     }
                 }
                 finally
                 {
                     await _context.Database.CloseConnectionAsync();
                     // ALWAYS clear tracker after each table to prevent pollution/leaks
                     _context.ChangeTracker.Clear();
                 }
            }
        }

        private Guid? _defaultTenantId; // Class level variable to store captured TenantId

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
                        // Check for escaped quote ""
                        if (i + 1 < line.Length && line[i + 1] == '"')
                        {
                            current.Append('"');
                            i++;
                        }
                        else
                        {
                            inQuotes = false;
                        }
                    }
                    else
                    {
                        current.Append(c);
                    }
                }
                else
                {
                    if (c == '"')
                    {
                        inQuotes = true;
                    }
                    else if (c == ',')
                    {
                        result.Add(current.ToString());
                        current.Clear();
                    }
                    else
                    {
                        current.Append(c);
                    }
                }
            }
            result.Add(current.ToString());
            return result;
        }
    }
}
