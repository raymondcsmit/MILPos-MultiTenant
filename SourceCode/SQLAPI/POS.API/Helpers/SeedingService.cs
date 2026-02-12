using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.AspNetCore.Identity;
using POS.Data;
using POS.Data.Entities;
using POS.Domain;
using POS.Common;
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
        private readonly IPasswordHasher<User> _passwordHasher;

        public SeedingService(POSDbContext context, IPasswordHasher<User> passwordHasher)
        {
            _context = context;
            _passwordHasher = passwordHasher;
        }

        public async Task SeedAsync()
        {
            try
            {
                // Check if the database is already seeded (Check Tenants)
                if (await _context.Tenants.AnyAsync())
                {
                     // Instead of returning, we will fetch the default TenantId for subsequent seeding
                     var defaultTenant = await _context.Tenants.FirstOrDefaultAsync();
                     if (defaultTenant != null)
                     {
                         _defaultTenantId = defaultTenant.Id;
                         Console.WriteLine($"Database already seeded. Using existing Default Tenant ID: {_defaultTenantId}");
                     }
                     
                     // OPTIMIZATION: If tenants exist, we assume the initial seeding is complete.
                     // Skipping the expensive CSV parsing and per-record existence checks significantly improves startup time.
                     Console.WriteLine("Database is initialized. Checking for new seed data...");
                     // return; // Allow continuing to seed new tables/records
                }

                Console.WriteLine("Starting database seeding from CSV files...");

                string seedDataPath = Path.Combine(AppContext.BaseDirectory, AppConstants.Seeding.SeedDataFolder);
                
                // Fallback searching logic
                if (!Directory.Exists(seedDataPath))
                {
                    var current = new DirectoryInfo(AppContext.BaseDirectory);
                    while (current != null)
                    {
                        var candidate = Path.Combine(current.FullName, AppConstants.Seeding.SeedDataFolder);
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
                // Order of seeding is critical for Foreign Keys even if we disable constraints
                var priorityTables = AppConstants.SeedingConstants.PriorityTables;

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

                // Open connection to persist session variables (like session_replication_role)
                await _context.Database.OpenConnectionAsync();

                try
                {
                    // Disable FK constraints if possible (Provider dependent)
                    var provider = _context.Database.ProviderName;
                    if (provider == AppConstants.DatabaseProviders.Sqlite)
                    {
                        await _context.Database.ExecuteSqlRawAsync("PRAGMA foreign_keys = OFF;");
                    }
                    else if (provider == AppConstants.DatabaseProviders.SqlServer)
                    {
                        // Disable all constraints
                        await _context.Database.ExecuteSqlRawAsync("EXEC sp_msforeachtable \"ALTER TABLE ? NOCHECK CONSTRAINT all\"");
                    }
                    else if (provider.Contains(AppConstants.DatabaseProviders.PostgreSql, StringComparison.OrdinalIgnoreCase))
                    {
                        try
                        {
                            // Disable FK constraints for the session in PostgreSQL
                            await _context.Database.ExecuteSqlRawAsync("SET session_replication_role = 'replica';");
                        }
                        catch (Exception ex)
                        {
                            // If this fails (e.g. standard user on AWS RDS), we continue but rely on the sorting logic below
                            Console.WriteLine($"Warning: Could not set session_replication_role to 'replica'. FKs remain active. Error: {ex.Message}");
                        }
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
                        if (provider == AppConstants.DatabaseProviders.Sqlite)
                        {
                            await _context.Database.ExecuteSqlRawAsync("PRAGMA foreign_keys = ON;");
                        }
                        else if (provider == AppConstants.DatabaseProviders.SqlServer)
                        {
                            await _context.Database.ExecuteSqlRawAsync("EXEC sp_msforeachtable \"ALTER TABLE ? WITH CHECK CHECK CONSTRAINT all\"");
                        }
                        else if (provider.Contains(AppConstants.DatabaseProviders.PostgreSql, StringComparison.OrdinalIgnoreCase))
                        {
                            try
                            {
                                // Re-enable FK constraints
                                await _context.Database.ExecuteSqlRawAsync("SET session_replication_role = 'origin';");
                            }
                            catch { /* Ignore error on cleanup if we couldn't set it in the first place */ }
                        }
                    }
                }
                finally
                {
                    await _context.Database.CloseConnectionAsync();
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

                // Force default password for seeded users
                if (entity is User user)
                {
                    user.PasswordHash = _passwordHasher.HashPassword(user, AppConstants.Seeding.DefaultPassword);
                    user.SecurityStamp = Guid.NewGuid().ToString();
                }
                
                // Smart Fill for BaseEntity dates
                if (entity is BaseEntity baseEntity)
                {
                     if (baseEntity.CreatedDate == DateTime.MinValue)
                     {
                         baseEntity.CreatedDate = DateTime.UtcNow;
                     }
                     if (baseEntity.ModifiedDate == DateTime.MinValue)
                     {
                         baseEntity.ModifiedDate = DateTime.UtcNow;
                     }
                }
                
                // Smart Fill for SharedBaseEntity dates (Global/Shared Entities)
                if (entity is SharedBaseEntity sharedEntity)
                {
                     if (sharedEntity.CreatedDate == DateTime.MinValue)
                     {
                         sharedEntity.CreatedDate = DateTime.UtcNow;
                     }
                     if (sharedEntity.ModifiedDate == DateTime.MinValue)
                     {
                         sharedEntity.ModifiedDate = DateTime.UtcNow;
                     }
                }
                
                // Auto-fill TenantId property if it exists and is currently Guid.Empty or null
                // EXCEPTION: MenuItems should remain Global (TenantId = null) unless specified
                if (this._defaultTenantId != null && this._defaultTenantId != Guid.Empty && !(entity is MenuItem))
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

            // Explicit Hierarchical sorting for self-referencing tables (ParentId)
            // This is crucial if FK constraints could not be disabled.
            if (entities.Any() && entities.Count > 1)
            {
                var props = typeof(T).GetProperties();
                var idProp = props.FirstOrDefault(p => p.Name.Equals("Id", StringComparison.OrdinalIgnoreCase) && p.PropertyType == typeof(Guid));
                var parentIdProp = props.FirstOrDefault(p => p.Name.Equals("ParentId", StringComparison.OrdinalIgnoreCase) && (p.PropertyType == typeof(Guid?) || p.PropertyType == typeof(Guid)));

                if (idProp != null && parentIdProp != null)
                {
                    Console.WriteLine($"Sorting {typeof(T).Name} hierarchically to Satisfy FKs...");
                    var sortedList = new List<T>();
                    var unsortedList = entities.ToList();

                    // Function to get ID and ParentID
                    Guid GetId(T e) => (Guid)idProp.GetValue(e);
                    Guid? GetParentId(T e)
                    {
                        var val = parentIdProp.GetValue(e);
                        if (val == null) return null;
                        if (val is Guid g) return g == Guid.Empty ? null : (Guid?)g;
                        return null;
                    }

                    // Pass 1: Roots (ParentId is null or not in the set)
                    // Note: If a parent ID refers to a record ALREADY in DB, it's fine. 
                    // But here we are sorting the NEW batch.
                    // We assume parents are either in DB or in this Batch.
                    
                    // Simple topological sort
                    var processedIds = new HashSet<Guid>();
                    
                    // If we want to be safe against parents already in DB, we can't easily check that without querying.
                    // But usually, sorting Parents -> Children within the batch corrects the immediate issue.
                    
                    int initialCount;
                    do
                    {
                        initialCount = unsortedList.Count;
                        // Find items where ParentId is null OR ParentId is already processed OR ParentId is not in the current unsorted batch (meaning it's in DB or non-existent)
                        var currentBatchIds = new HashSet<Guid>(unsortedList.Select(GetId));
                        
                        var readyItems = unsortedList.Where(e =>
                        {
                            var pid = GetParentId(e);
                            return pid == null || processedIds.Contains(pid.Value) || !currentBatchIds.Contains(pid.Value);
                        }).ToList();

                        if (readyItems.Any())
                        {
                            sortedList.AddRange(readyItems);
                            foreach (var item in readyItems)
                            {
                                processedIds.Add(GetId(item));
                                unsortedList.Remove(item);
                            }
                        }
                        else
                        {
                            // No progress made? Cycle or complex dependency?
                            break;
                        }

                    } while (unsortedList.Count > 0 && unsortedList.Count < initialCount);

                    // Add leftovers
                    if (unsortedList.Any())
                    {
                        sortedList.AddRange(unsortedList);
                        Console.WriteLine($"Warning: {unsortedList.Count} items in {typeof(T).Name} could not be strictly sorted (potential cycles). Appended to end.");
                    }

                    entities = sortedList;
                }
            }

            // Incremental Seeding Logic: Filter out entities that already exist
            if (entities.Any())
            {
                var newEntities = new List<T>();
                var entityType = _context.Model.FindEntityType(typeof(T));
                var primaryKey = entityType.FindPrimaryKey();
                var keyProperties = primaryKey.Properties;

                Console.WriteLine($"Checking for existing records in {typeof(T).Name}...");

                foreach (var entity in entities)
                {
                    try
                    {
                        // Get primary key values for this entity
                        var keyValues = keyProperties
                            .Select(p => p.PropertyInfo.GetValue(entity))
                            .ToArray();

                        // Check if it exists in the database
                        // FindAsync works for both single and composite keys
                        var existing = await _context.Set<T>().FindAsync(keyValues);
                        
                        // If checking TTenant, we might also want to check by Subdomain if Id check passed (for safety)
                        // But FindAsync is the most reliable for PK constraint violations.
                        
                        if (existing == null)
                        {
                            newEntities.Add(entity);
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error checking existence for {typeof(T).Name}: {ex.Message}");
                        // Fallback: assume it's new if check fails (risky but better than crashing)
                        newEntities.Add(entity);
                    }
                }

                entities = newEntities;

                if (entities.Any())
                {
                    Console.WriteLine($"Seeding {entities.Count} new records into {typeof(T).Name}...");
                }
                else
                {
                    // Console.WriteLine($"All records for {typeof(T).Name} already exist. Skipping.");
                }
            }

            if (entities.Any())
            {
                 var provider = _context.Database.ProviderName;
                 var entityType = _context.Model.FindEntityType(typeof(T));
                 var tableName = entityType.GetTableName();
                 var schema = entityType.GetSchema();
                 var fullTableName = string.IsNullOrEmpty(schema) ? $"[{tableName}]" : $"[{schema}].[{tableName}]";

                 bool isSqlServer = provider == AppConstants.DatabaseProviders.SqlServer;
                 bool isPostgres = provider.Contains(AppConstants.DatabaseProviders.PostgreSql, StringComparison.OrdinalIgnoreCase);

                 // Robust identity check for SQL Server: if it's SQL Server and has an 'Id' property of type int/long
                 // we assume it might be an identity column if we are trying to seed it explicitly.
                 bool hasIdentity = isSqlServer && entityType.GetProperties().Any(p => 
                        (p.Name.Equals("Id", StringComparison.OrdinalIgnoreCase)) && 
                        (p.ClrType == typeof(int) || p.ClrType == typeof(long)));
                
                 bool hasPostgresIdentity = isPostgres && entityType.GetProperties().Any(p =>
                        (p.Name.Equals("Id", StringComparison.OrdinalIgnoreCase)) &&
                        (p.ClrType == typeof(int) || p.ClrType == typeof(long)));

                 Console.WriteLine($"Table: {tableName}, FullPath: {fullTableName}, HasIdentity: {hasIdentity}");

                 // Wrap saving in a transaction to speed up SQLite bulk inserts significantly
                 using (var transaction = await _context.Database.BeginTransactionAsync())
                 {
                     try
                     {
                        if (hasIdentity)
                        {
                            Console.WriteLine($"Executing: SET IDENTITY_INSERT {fullTableName} ON");
                            await _context.Database.ExecuteSqlRawAsync($"SET IDENTITY_INSERT {fullTableName} ON");
                        }

                        var dbSet = _context.Set<T>();
                        
                        // Optimize: AddRange is better than Add in loop, but for massive datasets, 
                        // we should consider smaller batches if memory is an issue.
                        // For now, assuming CSVs are < 10k rows, AddRange is fine.
                        // Disable AutoDetectChanges for massive performance gain during AddRange
                        _context.ChangeTracker.AutoDetectChangesEnabled = false;
                        
                        await dbSet.AddRangeAsync(entities);
                        await _context.SaveChangesAsync();
                        
                        _context.ChangeTracker.AutoDetectChangesEnabled = true;

                        if (hasIdentity)
                        {
                            await _context.Database.ExecuteSqlRawAsync($"SET IDENTITY_INSERT {fullTableName} OFF");
                        }

                    if (hasPostgresIdentity)
                        {
                            // Reset sequence for PostgreSQL to prevent PK violations on future inserts
                            // This assumes standard naming convention for sequences: "TableName_Id_seq" or equivalent lookup
                            // pg_get_serial_sequence handles quoted names correctly
                             await _context.Database.ExecuteSqlRawAsync(@$"
                                SELECT setval(
                                    pg_get_serial_sequence('""{tableName}""', 'Id'), 
                                    COALESCE((SELECT MAX(""Id"") + 1 FROM ""{tableName}""), 1), 
                                    false
                                );");
                        }
                        
                        await transaction.CommitAsync();
                     }
                     catch (Exception ex) 
                     {
                         await transaction.RollbackAsync();
                         
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
                         // ALWAYS clear tracker after each table to prevent pollution/leaks
                         _context.ChangeTracker.Clear();
                         _context.ChangeTracker.AutoDetectChangesEnabled = true; // Ensure it's back on
                     }
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
