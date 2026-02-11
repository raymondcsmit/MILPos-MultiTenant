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

namespace POS.MediatR.Tenant.Handlers
{
    public class ExportTenantToSqliteCommandHandler : IRequestHandler<ExportTenantToSqliteCommand, ServiceResponse<ExportTenantToSqliteCommandResult>>
    {
        private readonly POSDbContext _sourceContext;

        public ExportTenantToSqliteCommandHandler(POSDbContext sourceContext)
        {
            _sourceContext = sourceContext;
        }

        public async Task<ServiceResponse<ExportTenantToSqliteCommandResult>> Handle(ExportTenantToSqliteCommand request, CancellationToken cancellationToken)
        {
            var tempFolder = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
            Directory.CreateDirectory(tempFolder);

            var dbFileName = "POSDb.db";
            var dbFilePath = Path.Combine(tempFolder, dbFileName);
            var zipFilePath = Path.Combine(Path.GetTempPath(), $"POS_Export_{request.TenantId}_{DateTime.UtcNow:yyyyMMddHHmmss}.zip");
            var exportTime = DateTime.UtcNow;

            try
            {
                // 1. Setup Destination Context (SQLite)
                var optionsBuilder = new DbContextOptionsBuilder<POSDbContext>();
                optionsBuilder.UseSqlite($"Data Source={dbFilePath}");

                using var destinationContext = new POSDbContext(optionsBuilder.Options, new ExportTenantProvider(request.TenantId));
                await destinationContext.Database.EnsureCreatedAsync(cancellationToken);

                // 2. Pre-fetch User and Role IDs for filtering dependent entities
                var userIds = await _sourceContext.Users
                    .IgnoreQueryFilters()
                    .Where(u => u.TenantId == request.TenantId)
                    .Select(u => u.Id)
                    .ToListAsync(cancellationToken);

                var roleIds = await _sourceContext.Roles
                    .IgnoreQueryFilters()
                    .Where(r => r.TenantId == request.TenantId)
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

                foreach (var property in dbSetProperties)
                {
                    var entityType = property.PropertyType.GetGenericArguments()[0];
                    if (IsExcludedEntity(entityType)) continue;

                    var method = this.GetType().GetMethod(nameof(CopyEntity), BindingFlags.NonPublic | BindingFlags.Instance);
                    var genericMethod = method.MakeGenericMethod(entityType);
                    await (Task)genericMethod.Invoke(this, new object[] { _sourceContext, destinationContext, request.TenantId, userIds, roleIds, cancellationToken });
                }
                
                // 4. Generate SyncMetadata
                await GenerateSyncMetadata(destinationContext, dbSetProperties, exportTime, cancellationToken);
                
                // 5. Generate appsettings.json
                var appSettings = new
                {
                    TenantId = request.TenantId,
                    ApiKey = request.ApiKey,
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
                if (Directory.Exists(tempFolder)) Directory.Delete(tempFolder, true);
            }
        }

        private bool IsExcludedEntity(Type type)
        {
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
            IQueryable<T> query = source.Set<T>().IgnoreQueryFilters().AsNoTracking();

            // Apply Filters
            if (typeof(T) == typeof(POS.Data.Entities.Tenant))
            {
                // Special handling for Tenant entity itself
                var pTenantId = typeof(T).GetProperty("Id");
                // Need to build expression equivalent to: x => x.Id == tenantId
                // Or just use client-side eval for this one record since it's just one
                 query = (IQueryable<T>)query.AsEnumerable().Where(x => (Guid)pTenantId.GetValue(x) == tenantId).AsQueryable();
            }
            else if (typeof(BaseEntity).IsAssignableFrom(typeof(T)) || typeof(T).GetProperty("TenantId") != null)
            {
                // Multi-tenant entities
                // We use dynamic linq or build expression manually?
                // Using reflection on the property is easier if we accept client-side eval for small batches, but for large data we need server-side.
                // Building Expression Tree is best practice.
                
                var parameter = System.Linq.Expressions.Expression.Parameter(typeof(T), "x");
                var property = System.Linq.Expressions.Expression.Property(parameter, "TenantId");
                var constant = System.Linq.Expressions.Expression.Constant(tenantId);
                var equality = System.Linq.Expressions.Expression.Equal(property, constant);
                var lambda = System.Linq.Expressions.Expression.Lambda<Func<T, bool>>(equality, parameter);
                
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
                dest.Set<T>().AddRange(data);
                await dest.SaveChangesAsync(cancellationToken);
                dest.ChangeTracker.Clear();
            }
        }
        
        private bool HasUserId(Type t) => t.GetProperty("UserId") != null && t.GetProperty("UserId").PropertyType == typeof(Guid);
        private bool HasRoleId(Type t) => t.GetProperty("RoleId") != null && t.GetProperty("RoleId").PropertyType == typeof(Guid);

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
