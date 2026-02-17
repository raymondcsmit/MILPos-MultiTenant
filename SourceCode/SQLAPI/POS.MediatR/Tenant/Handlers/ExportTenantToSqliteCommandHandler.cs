using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data;
using POS.Data.Entities;
using POS.Domain;
using POS.Helper;
using POS.MediatR.Tenant.Commands;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;

namespace POS.MediatR.Tenant.Handlers
{
    public class ExportTenantToSqliteCommandHandler : IRequestHandler<ExportTenantToSqliteCommand, ServiceResponse<ExportTenantToSqliteCommandResult>>
    {
        private readonly POSDbContext _sourceContext;
        private readonly POS.Common.Services.IFileStorageService _fileStorageService;
        private readonly PathHelper _pathHelper;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly Microsoft.Extensions.Configuration.IConfiguration _configuration;

        public ExportTenantToSqliteCommandHandler(
            POSDbContext sourceContext, 
            POS.Common.Services.IFileStorageService fileStorageService,
            PathHelper pathHelper,
            IWebHostEnvironment webHostEnvironment,
            Microsoft.Extensions.Configuration.IConfiguration configuration)
        {
            _sourceContext = sourceContext;
            _fileStorageService = fileStorageService;
            _pathHelper = pathHelper;
            _webHostEnvironment = webHostEnvironment;
            _configuration = configuration;
        }

        public async Task<ServiceResponse<ExportTenantToSqliteCommandResult>> Handle(ExportTenantToSqliteCommand request, CancellationToken cancellationToken)
        {
            // ... (existing code for tempFolder setup) ...
            var tempFolder = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
            Directory.CreateDirectory(tempFolder);

            var dbFileName = "POSDb.db";
            var dbFilePath = Path.Combine(tempFolder, dbFileName);
            var zipFilePath = Path.Combine(Path.GetTempPath(), $"POS_Export_{request.TenantId}_{DateTime.UtcNow:yyyyMMddHHmmss}.zip");
            var exportTime = DateTime.UtcNow;

            try
            {
                // ... (rest of the logic) ...

                // 1. Setup Destination Database
                var templatePath = Path.Combine(_webHostEnvironment.WebRootPath, "App_Data", "Templates", "POSDb.db");
                bool templateUsed = false;

                if (File.Exists(templatePath))
                {
                    File.Copy(templatePath, dbFilePath, true);
                    templateUsed = true;
                }

                // Setup Context
                var optionsBuilder = new DbContextOptionsBuilder<POSDbContext>();
                optionsBuilder.UseSqlite($"Data Source={dbFilePath}");

                using (var destinationContext = new POSDbContext(optionsBuilder.Options, new ExportTenantProvider(request.TenantId)))
                {
                    if (!templateUsed)
                    {
                        // Fallback: Create Schema at Runtime if template missing
                        // Use EnsureCreatedAsync (safer than MigrateAsync in this context)
                        await destinationContext.Database.EnsureCreatedAsync(cancellationToken);

                        // Manually inject Migration History so client thinks it's migrated
                        var historySql = @"
                            CREATE TABLE IF NOT EXISTS ""__EFMigrationsHistory"" (
                                ""MigrationId"" TEXT NOT NULL CONSTRAINT ""PK___EFMigrationsHistory"" PRIMARY KEY,
                                ""ProductVersion"" TEXT NOT NULL
                            );
                            INSERT INTO ""__EFMigrationsHistory"" (""MigrationId"", ""ProductVersion"")
                            VALUES ('20260213024351_MainInitSqlite', '10.0.2');
                        ";
                        await destinationContext.Database.ExecuteSqlRawAsync(historySql, cancellationToken);
                    }

                    // Open connection explicitly to keep PRAGMA settings active for the session
                    await destinationContext.Database.OpenConnectionAsync(cancellationToken);
                    // DISABLE FOREIGN KEY CONSTRAINTS during import to avoid ordering issues
                    await destinationContext.Database.ExecuteSqlRawAsync("PRAGMA foreign_keys = OFF;", cancellationToken);

                    // 2. Pre-fetch User and Role IDs for filtering dependent entities
                    var userIds = await _sourceContext.Users
                        .IgnoreQueryFilters()
                        .Where(u => u.TenantId == request.TenantId || u.TenantId == Guid.Empty)
                        .Select(u => u.Id)
                        .ToListAsync(cancellationToken);

                    var roleIds = await _sourceContext.Roles
                        .IgnoreQueryFilters()
                        .Where(r => r.TenantId == request.TenantId || r.TenantId == Guid.Empty)
                        .Select(r => r.Id)
                        .ToListAsync(cancellationToken);

                    // Fetch Tenant ApiKey if not provided in request
                    if (string.IsNullOrEmpty(request.ApiKey))
                    {
                        var tenant = await _sourceContext.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == request.TenantId, cancellationToken);
                        request.ApiKey = tenant?.ApiKey;
                    }

                    // 3. Iterate and Copy Data
                    var dbSetProperties = typeof(POSDbContext).GetProperties()
                        .Where(p => p.PropertyType.IsGenericType && 
                                    p.PropertyType.GetGenericTypeDefinition() == typeof(DbSet<>));

                    var errors = new System.Text.StringBuilder();

                    foreach (var property in dbSetProperties)
                    {
                        var entityType = property.PropertyType.GetGenericArguments()[0];
                        if (IsExcludedEntity(entityType)) continue;

                        try
                        {
                            var method = this.GetType().GetMethod(nameof(CopyEntity), BindingFlags.NonPublic | BindingFlags.Instance);
                            var genericMethod = method.MakeGenericMethod(entityType);
                            await (Task)genericMethod.Invoke(this, new object[] { _sourceContext, destinationContext, request.TenantId, userIds, roleIds, cancellationToken });
                        }
                        catch (Exception ex)
                        {
                            var msg = ex.InnerException?.Message ?? ex.Message;
                            if (ex is System.Reflection.TargetInvocationException tie && tie.InnerException != null)
                            {
                                msg = tie.InnerException.InnerException?.Message ?? tie.InnerException.Message;
                            }
                            errors.AppendLine($"Failed to copy {entityType.Name}: {msg}");
                        }
                    }
                    
                    if (errors.Length > 0)
                    {
                        throw new Exception(errors.ToString());
                    }

                    // 4. Generate SyncMetadata
                    await GenerateSyncMetadata(destinationContext, dbSetProperties, exportTime, cancellationToken);

                    // 5. Copy Company Logo if exists
                    var companyProfile = await destinationContext.CompanyProfiles.IgnoreQueryFilters().FirstOrDefaultAsync(cancellationToken);
                    if (companyProfile != null && !string.IsNullOrEmpty(companyProfile.LogoUrl))
                    {
                        try
                        {
                            var relativePath = Path.Combine(_pathHelper.CompanyLogo, companyProfile.LogoUrl).Replace("\\", "/");
                            var sourcePhysicalPath = _fileStorageService.GetPhysicalPath(relativePath);

                            if (File.Exists(sourcePhysicalPath))
                            {
                                var destLogoDir = Path.Combine(tempFolder, "wwwroot", _pathHelper.CompanyLogo);
                                if (!Directory.Exists(destLogoDir)) Directory.CreateDirectory(destLogoDir);

                                var destLogoPath = Path.Combine(destLogoDir, companyProfile.LogoUrl);
                                File.Copy(sourcePhysicalPath, destLogoPath, true);
                            }
                        }
                        catch (Exception ex)
                        {
                            // Log but don't fail the whole export just for the logo
                            System.Console.WriteLine($"Warning: Failed to copy company logo: {ex.Message}");
                        }
                    }
                }

                // Force release of file locks
                Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
                
                // 5. Generate appsettings.json
                var jwtSettings = new Dictionary<string, string>();
                _configuration.GetSection("JwtSettings").Bind(jwtSettings);

                var appSettings = new
                {
                    TenantId = request.TenantId,
                    ApiKey = request.ApiKey,
                    JwtSettings = jwtSettings,
                    SyncSettings = new
                    {
                        CloudApiUrl = request.CloudApiUrl,
                        SyncIntervalMinutes = 15,
                        AutoSync = true
                    },
                    DatabaseProvider = "Sqlite",
                    ConnectionStrings = new
                    {
                        SqliteConnectionString = $"Data Source={dbFileName}"
                    }
                };
                
                var jsonOptions = new System.Text.Json.JsonSerializerOptions { WriteIndented = true };
                var jsonString = System.Text.Json.JsonSerializer.Serialize(appSettings, jsonOptions);
                await File.WriteAllTextAsync(Path.Combine(tempFolder, "appsettings.json"), jsonString, cancellationToken);

                // 6. Create Zip
                System.IO.Compression.ZipFile.CreateFromDirectory(tempFolder, zipFilePath);

                return ServiceResponse<ExportTenantToSqliteCommandResult>.ReturnResultWith200(new ExportTenantToSqliteCommandResult
                {
                    FilePath = zipFilePath,
                    FileName = $"POS_Export_{request.TenantId}_{DateTime.UtcNow:yyyyMMdd}.zip"
                });
            }
            catch (Exception ex)
            {
                if (File.Exists(zipFilePath)) File.Delete(zipFilePath);
                return ServiceResponse<ExportTenantToSqliteCommandResult>.ReturnFailed(500, "Export failed: " + (ex.InnerException?.Message ?? ex.Message));
            }
            finally
            {
                // Ensure locks are released even on error to prevent cleanup failures
                Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
                
                try 
                {
                    if (Directory.Exists(tempFolder)) Directory.Delete(tempFolder, true);
                }
                catch
                {
                    // Ignore cleanup errors (like file locks) to allow the original error response to be returned
                }
            }
        }

        private bool IsExcludedEntity(Type type)
        {
            // Exclude IdentityUserPasskey (New in .NET 8, not configured in our context)
            if (type.Name.StartsWith("IdentityUserPasskey")) return true;

            var excludedTypes = new[] 
            { 
                typeof(SyncMetadata), 
                typeof(SyncLog), 
                typeof(LoginAudit), 
                typeof(NLog), 
                typeof(Data.EmailLog),
                typeof(POS.Data.Entities.FBR.FBRSubmissionLog)
            };
            return excludedTypes.Contains(type);
        }

        private async Task CopyEntity<T>(POSDbContext source, POSDbContext dest, Guid tenantId, List<Guid> userIds, List<Guid> roleIds, CancellationToken cancellationToken) where T : class
        {
            IQueryable<T> query = source.Set<T>()
                .IgnoreQueryFilters()
                .IgnoreAutoIncludes()
                .AsNoTracking();

            // Explicitly Include Orphans (entities without TenantId/Parent) owned by this entity
            // e.g. Supplier -> SupplierAddress
            var props = typeof(T).GetProperties();
            foreach (var prop in props)
            {
                if (IsOrphan(prop.PropertyType))
                {
                    query = query.Include(prop.Name);
                }
            }

            // Apply Filters
            if (typeof(T) == typeof(POS.Data.Entities.Tenant))
            {
                // Special handling for Tenant entity itself
                // x => x.Id == tenantId
                var parameter = System.Linq.Expressions.Expression.Parameter(typeof(T), "x");
                var property = System.Linq.Expressions.Expression.Property(parameter, "Id");
                var constant = System.Linq.Expressions.Expression.Constant(tenantId);
                var equality = System.Linq.Expressions.Expression.Equal(property, constant);
                var lambda = System.Linq.Expressions.Expression.Lambda<Func<T, bool>>(equality, parameter);
                
                query = query.Where(lambda);
            }
            else if (typeof(BaseEntity).IsAssignableFrom(typeof(T)) || typeof(T).GetProperty("TenantId") != null)
            {
                // Multi-tenant entities
                // We use dynamic linq or build expression manually?
                // Using reflection on the property is easier if we accept client-side eval for small batches, but for large data we need server-side.
                // Building Expression Tree is best practice.
                
                var parameter = System.Linq.Expressions.Expression.Parameter(typeof(T), "x");
                var property = System.Linq.Expressions.Expression.Property(parameter, "TenantId");
                
                System.Linq.Expressions.Expression constant;
                System.Linq.Expressions.Expression equality;
                System.Linq.Expressions.Expression equalityEmpty;
                System.Linq.Expressions.Expression orExpression;

                if (property.Type == typeof(Guid?))
                {
                    // Handle Nullable TenantId (e.g. MenuItem)
                    constant = System.Linq.Expressions.Expression.Constant((Guid?)tenantId, typeof(Guid?));
                    equality = System.Linq.Expressions.Expression.Equal(property, constant);

                    var emptyGuid = System.Linq.Expressions.Expression.Constant((Guid?)Guid.Empty, typeof(Guid?));
                    equalityEmpty = System.Linq.Expressions.Expression.Equal(property, emptyGuid);
                    
                    orExpression = System.Linq.Expressions.Expression.Or(equality, equalityEmpty);
                    
                    // Include NULL as "Global"
                    var nullConst = System.Linq.Expressions.Expression.Constant(null, typeof(Guid?));
                    var equalityNull = System.Linq.Expressions.Expression.Equal(property, nullConst);
                    orExpression = System.Linq.Expressions.Expression.Or(orExpression, equalityNull);
                }
                else
                {
                    // Standard Guid TenantId
                    constant = System.Linq.Expressions.Expression.Constant(tenantId);
                    equality = System.Linq.Expressions.Expression.Equal(property, constant);
                    
                    var emptyGuid = System.Linq.Expressions.Expression.Constant(Guid.Empty);
                    equalityEmpty = System.Linq.Expressions.Expression.Equal(property, emptyGuid);
                    orExpression = System.Linq.Expressions.Expression.Or(equality, equalityEmpty);
                }

                var lambda = System.Linq.Expressions.Expression.Lambda<Func<T, bool>>(orExpression, parameter);
                
                query = query.Where(lambda);
            }
            else if (HasParentWithTenantId(typeof(T), out var parentPath))
            {
                 // Dependent on Parent with TenantId (e.g. PurchaseOrderItem -> PurchaseOrder)
                 // x => x.Parent.TenantId == tenantId || x.Parent.TenantId == Guid.Empty
                 var parameter = System.Linq.Expressions.Expression.Parameter(typeof(T), "x");
                 var parts = parentPath.Split('.');
                 System.Linq.Expressions.Expression property = parameter;
                 foreach(var part in parts)
                     property = System.Linq.Expressions.Expression.Property(property, part);
                 
                 var tenantIdProp = System.Linq.Expressions.Expression.Property(property, "TenantId");
                 
                 System.Linq.Expressions.Expression constant;
                 System.Linq.Expressions.Expression equality;
                 System.Linq.Expressions.Expression equalityEmpty;
                 System.Linq.Expressions.Expression orExpression;

                 if (tenantIdProp.Type == typeof(Guid?))
                 {
                     constant = System.Linq.Expressions.Expression.Constant((Guid?)tenantId, typeof(Guid?));
                     equality = System.Linq.Expressions.Expression.Equal(tenantIdProp, constant);

                     var emptyGuid = System.Linq.Expressions.Expression.Constant((Guid?)Guid.Empty, typeof(Guid?));
                     equalityEmpty = System.Linq.Expressions.Expression.Equal(tenantIdProp, emptyGuid);
                     
                     orExpression = System.Linq.Expressions.Expression.Or(equality, equalityEmpty);

                     var nullConst = System.Linq.Expressions.Expression.Constant(null, typeof(Guid?));
                     var equalityNull = System.Linq.Expressions.Expression.Equal(tenantIdProp, nullConst);
                     orExpression = System.Linq.Expressions.Expression.Or(orExpression, equalityNull);
                 }
                 else
                 {
                     constant = System.Linq.Expressions.Expression.Constant(tenantId);
                     equality = System.Linq.Expressions.Expression.Equal(tenantIdProp, constant);
                     
                     var emptyGuid = System.Linq.Expressions.Expression.Constant(Guid.Empty);
                     equalityEmpty = System.Linq.Expressions.Expression.Equal(tenantIdProp, emptyGuid);
                     orExpression = System.Linq.Expressions.Expression.Or(equality, equalityEmpty);
                 }

                 var lambda = System.Linq.Expressions.Expression.Lambda<Func<T, bool>>(orExpression, parameter);
                 
                 query = query.Where(lambda);
            }
            else if (typeof(SharedBaseEntity).IsAssignableFrom(typeof(T)))
            {
                // Shared entities - Copy All
                // No filter
            }
            else if (HasUserId(typeof(T)))
            {
                 // Dependent on User
                 // x => userIds.Contains(x.UserId)
                 var parameter = System.Linq.Expressions.Expression.Parameter(typeof(T), "x");
                 var property = System.Linq.Expressions.Expression.Property(parameter, "UserId");
                 var constant = System.Linq.Expressions.Expression.Constant(userIds);
                 var containsMethod = typeof(List<Guid>).GetMethod("Contains");
                 var containsCall = System.Linq.Expressions.Expression.Call(constant, containsMethod, property);
                 var lambda = System.Linq.Expressions.Expression.Lambda<Func<T, bool>>(containsCall, parameter);
                 
                 query = query.Where(lambda);
            }
             else if (HasRoleId(typeof(T)))
            {
                 // Dependent on Role
                 // x => roleIds.Contains(x.RoleId)
                 var parameter = System.Linq.Expressions.Expression.Parameter(typeof(T), "x");
                 var property = System.Linq.Expressions.Expression.Property(parameter, "RoleId");
                 var constant = System.Linq.Expressions.Expression.Constant(roleIds);
                 var containsMethod = typeof(List<Guid>).GetMethod("Contains");
                 var containsCall = System.Linq.Expressions.Expression.Call(constant, containsMethod, property);
                 var lambda = System.Linq.Expressions.Expression.Lambda<Func<T, bool>>(containsCall, parameter);
                 
                 query = query.Where(lambda);
            }
            else
            {
                // Unknown/Unfiltered - Skip to be safe? Or Copy All?
                // Better to skip and log? 
                // For now, let's skip to avoid leaking global data that isn't SharedBaseEntity
                System.Console.WriteLine($"Skipping entity {typeof(T).Name} - No filtering strategy found.");
                return;
            }

            // Execute Copy
            var data = await query.ToListAsync(cancellationToken);
            if (data.Any())
            {
                // Safety: Detach navigation properties that are NOT orphans to prevent EF from tracking duplicates
                // This ensures we only copy the raw entity data + explicitly included orphans
                foreach (var entity in data)
                {
                    var eType = entity.GetType();
                    foreach (var prop in eType.GetProperties())
                    {
                        if (prop.PropertyType.IsClass && 
                            prop.PropertyType != typeof(string) && 
                            !typeof(System.Collections.IEnumerable).IsAssignableFrom(prop.PropertyType))
                        {
                            // If it's a reference to another entity and NOT an orphan we explicitly included
                            if (!IsOrphan(prop.PropertyType))
                            {
                                if (prop.CanWrite)
                                {
                                    try { prop.SetValue(entity, null); } catch { }
                                }
                            }
                        }
                    }
                }

                dest.Set<T>().AddRange(data);
                await dest.SaveChangesAsync(cancellationToken);
                dest.ChangeTracker.Clear();
            }
        }
        
        private bool HasUserId(Type t) => t.GetProperty("UserId") != null && t.GetProperty("UserId").PropertyType == typeof(Guid);
        private bool HasRoleId(Type t) => t.GetProperty("RoleId") != null && t.GetProperty("RoleId").PropertyType == typeof(Guid);

        private bool HasParentWithTenantId(Type t, out string path)
        {
            path = null;
            
            // Exclude User/Role/Common types from being considered as "Parents"
            var ignoredTypes = new[] { typeof(User), typeof(Role), typeof(UserRole) };
            
            var props = t.GetProperties()
                .Where(p => p.PropertyType.IsClass 
                       && p.PropertyType != typeof(string) 
                       && !typeof(System.Collections.IEnumerable).IsAssignableFrom(p.PropertyType)
                       && !ignoredTypes.Contains(p.PropertyType))
                .ToList();

            // Priority 1: Property Name is contained in Entity Name (Ownership Heuristic)
            // e.g. PurchaseOrderItem -> PurchaseOrder
            // e.g. PurchaseOrderItemTax -> PurchaseOrderItem
            foreach (var prop in props)
            {
                // Check if property name matches start of type name
                if (t.Name.StartsWith(prop.Name) || t.Name.Contains(prop.Name))
                {
                    if (HasTenantIdRecursive(prop.PropertyType, out var subPath, new List<Type> { t }))
                    {
                        path = string.IsNullOrEmpty(subPath) ? prop.Name : $"{prop.Name}.{subPath}";
                        return true;
                    }
                }
            }

            // Priority 2: Any valid path to TenantId
            foreach (var prop in props)
            {
                if (HasTenantIdRecursive(prop.PropertyType, out var subPath, new List<Type> { t }))
                {
                    path = string.IsNullOrEmpty(subPath) ? prop.Name : $"{prop.Name}.{subPath}";
                    return true;
                }
            }

            return false;
        }

        private bool HasTenantIdRecursive(Type t, out string subPath, List<Type> visited, int depth = 0)
        {
            subPath = "";
            if (depth > 3) return false; // Prevent deep recursion
            if (visited.Contains(t)) return false; // Prevent cycles
            
            visited.Add(t);

            // 1. Direct TenantId
            if (typeof(BaseEntity).IsAssignableFrom(t) || t.GetProperty("TenantId") != null)
            {
                return true;
            }

            // 2. Recursive check on properties
            var ignoredTypes = new[] { typeof(User), typeof(Role), typeof(UserRole) };
            var props = t.GetProperties()
                .Where(p => p.PropertyType.IsClass 
                       && p.PropertyType != typeof(string) 
                       && !typeof(System.Collections.IEnumerable).IsAssignableFrom(p.PropertyType)
                       && !ignoredTypes.Contains(p.PropertyType))
                .ToList();

            foreach (var prop in props)
            {
                 // Create a new list for the branch to avoid affecting other branches
                 var newVisited = new List<Type>(visited);
                 if (HasTenantIdRecursive(prop.PropertyType, out var childPath, newVisited, depth + 1))
                 {
                     subPath = string.IsNullOrEmpty(childPath) ? prop.Name : $"{prop.Name}.{childPath}";
                     return true;
                 }
            }

            return false;
        }

        private bool IsOrphan(Type t)
        {
            if (!t.IsClass || t == typeof(string) || typeof(System.Collections.IEnumerable).IsAssignableFrom(t)) return false;
            if (IsExcludedEntity(t)) return false;
            
            // Explicitly exclude Tenant (it's a root entity, not an orphan)
            if (t == typeof(POS.Data.Entities.Tenant) || t.Name == "Tenant") return false;

            if (typeof(BaseEntity).IsAssignableFrom(t)) return false;
            if (t.GetProperty("TenantId") != null) return false;
            if (HasParentWithTenantId(t, out _)) return false;
            if (HasUserId(t)) return false;
            if (HasRoleId(t)) return false;
            if (typeof(SharedBaseEntity).IsAssignableFrom(t)) return false;
            
            // It must be an entity (Has Id)
            if (t.GetProperty("Id") == null) return false;

            return true;
        }

        private async Task GenerateSyncMetadata(POSDbContext dest, IEnumerable<PropertyInfo> dbSetProperties, DateTime exportTime, CancellationToken cancellationToken)
        {
            var syncMetadatas = new List<SyncMetadata>();
             foreach (var property in dbSetProperties)
            {
                 var entityType = property.PropertyType.GetGenericArguments()[0];
                 if (IsExcludedEntity(entityType)) continue;
                 
                 syncMetadatas.Add(new SyncMetadata
                 {
                     EntityType = entityType.Name,
                     LastPullSync = exportTime,
                     LastPushSync = exportTime,
                     LastSuccessfulSync = exportTime,
                     PendingChanges = 0
                 });
            }
            
            dest.SyncMetadata.AddRange(syncMetadatas);
            await dest.SaveChangesAsync(cancellationToken);
        }

        // Dummy TenantProvider for Export Context
        private class ExportTenantProvider : ITenantProvider
        {
            private readonly Guid _tenantId;
            public ExportTenantProvider(Guid tenantId)
            {
                _tenantId = tenantId;
            }
            public Guid? GetTenantId() => _tenantId;
            public Task<POS.Data.Entities.Tenant> GetCurrentTenantAsync() => Task.FromResult<POS.Data.Entities.Tenant>(null);
            public void SetTenantId(Guid tenantId) { }
        }
    }
}
