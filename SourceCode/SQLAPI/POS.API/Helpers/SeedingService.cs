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
using System.Threading.Tasks;
using MediatR;
using POS.MediatR.CommandAndQuery;
using POS.Common.Services;

namespace POS.API.Helpers
{
    public class SeedingService
    {
        private readonly POSDbContext _context;
        private readonly IPasswordHasher<User> _passwordHasher;
        private readonly UserManager<User> _userManager;
        private readonly RoleManager<Role> _roleManager;
        private readonly IMediator _mediator;
        private readonly Microsoft.Extensions.Options.IOptions<POS.Data.Dto.MasterTenantSettings> _masterTenantSettings;
        private readonly ICsvParserService _csvParserService;
        private readonly IDbUtilityService _dbUtilityService;

        public SeedingService(
            POSDbContext context, 
            IPasswordHasher<User> passwordHasher, 
            UserManager<User> userManager,
            RoleManager<Role> roleManager,
            IMediator mediator,
            Microsoft.Extensions.Options.IOptions<POS.Data.Dto.MasterTenantSettings> masterTenantSettings,
            ICsvParserService csvParserService,
            IDbUtilityService dbUtilityService)
        {
            _context = context;
            _passwordHasher = passwordHasher;
            _userManager = userManager;
            _roleManager = roleManager;
            _mediator = mediator;
            _masterTenantSettings = masterTenantSettings;
            _csvParserService = csvParserService;
            _dbUtilityService = dbUtilityService;
        }

        public async Task SeedAsync()
        {
            try
            {
                // Resolve SeedData Path
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

                await _context.Database.OpenConnectionAsync();
                await _dbUtilityService.DisableForeignKeyCheckAsync(_context);

                // Check/Create Master Tenant first
                await EnsureMasterTenantAsync(seedDataPath);

                if (await _context.Tenants.AnyAsync())
                {
                     var defaultTenant = await _context.Tenants.FirstOrDefaultAsync();
                     if (defaultTenant != null)
                     {
                          _defaultTenantId = defaultTenant.Id;
                          Console.WriteLine($"Database already seeded. Using existing Default Tenant ID: {_defaultTenantId}");
                     }
                     
                     Console.WriteLine("Database is initialized. Checking for new seed data...");
                }

                Console.WriteLine("Starting database seeding from CSV files...");

                var priorityTables = AppConstants.SeedingConstants.PriorityTables;
                var dbSets = _context.GetType().GetProperties()
                    .Where(p => p.PropertyType.IsGenericType && 
                                p.PropertyType.GetGenericTypeDefinition() == typeof(DbSet<>))
                    .ToDictionary(p => p.Name, p => p);

                var csvFiles = Directory.GetFiles(seedDataPath, "*.csv");
                var sortedFiles = csvFiles.OrderBy(f => {
                    var name = Path.GetFileNameWithoutExtension(f);
                    var index = priorityTables.IndexOf(name);
                    return index == -1 ? int.MaxValue : index;
                }).ThenBy(f => Path.GetFileNameWithoutExtension(f)).ToList();

                try
                {

                    try
                    {
                        foreach (var file in sortedFiles)
                        {
                            var tableName = Path.GetFileNameWithoutExtension(file);
                            if (tableName.StartsWith("sqlite") || tableName.StartsWith("__")) continue;

                            if (tableName.Equals("Tenants", StringComparison.OrdinalIgnoreCase) && 
                                !string.IsNullOrEmpty(_masterTenantSettings.Value.SubDomain))
                            {
                                continue;
                            }
                            
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
                        
                        // Verify/Assign Admin Role to the Master User
                        if (!string.IsNullOrEmpty(_masterTenantSettings.Value.SubDomain))
                        {
                            await AssignMasterAdminRoleAsync();
                        }
                    }
                    finally
                    {
                        // Re-enable FK logic
                        await _dbUtilityService.EnableForeignKeyCheckAsync(_context);
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

        private async Task AssignMasterAdminRoleAsync()
        {
            var options = _masterTenantSettings.Value;
            var adminEmail = options.AdminUser;
            
            var user = await _userManager.FindByEmailAsync(adminEmail);
            if (user == null || user.TenantId != options.TenantId) return;

            var adminRoleName = "Admin"; 
            var superAdminRoleName = "Super Admin";

            if (!await _roleManager.RoleExistsAsync(adminRoleName))
            {
                Console.WriteLine($"Creating missing role: {adminRoleName}");
                await _roleManager.CreateAsync(new Role 
                { 
                    Name = adminRoleName, 
                    NormalizedName = adminRoleName.ToUpper(), 
                    TenantId = options.TenantId 
                });
            }
            if (!await _roleManager.RoleExistsAsync(superAdminRoleName))
            {
                Console.WriteLine($"Creating missing role: {superAdminRoleName}");
                await _roleManager.CreateAsync(new Role 
                { 
                    Name = superAdminRoleName, 
                    NormalizedName = superAdminRoleName.ToUpper(), 
                    TenantId = options.TenantId 
                });
            }

            if (!await _userManager.IsInRoleAsync(user, adminRoleName))
            {
                Console.WriteLine($"Assigning '{adminRoleName}' role to Master Admin...");
                await _userManager.AddToRoleAsync(user, adminRoleName);
            }

            if (!await _userManager.IsInRoleAsync(user, superAdminRoleName))
            {
                Console.WriteLine($"Assigning '{superAdminRoleName}' role to Master Admin...");
                await _userManager.AddToRoleAsync(user, superAdminRoleName);
            }
        }

        private async Task<Guid> GetOrCreateRoleAsync(string roleName, Guid tenantId, bool isSuperRole, string seedDataPath = null)
        {
            var role = await _roleManager.FindByNameAsync(roleName);
            if (role != null) return role.Id;

            // Attempt to find original ID from CSV to maintain consistency
            Guid roleId = Guid.NewGuid();
            try
            {
                if (!string.IsNullOrEmpty(seedDataPath))
                {
                    string rolesCsv = Path.Combine(seedDataPath, "Roles.csv");
                    if (File.Exists(rolesCsv))
                    {
                        var lines = await File.ReadAllLinesAsync(rolesCsv);
                        if (lines.Length > 1)
                        {
                            var headers = _csvParserService.ParseCsvLine(lines[0]);
                            int nameIndex = headers.FindIndex(h => h.Equals("Name", StringComparison.OrdinalIgnoreCase));
                            int idIndex = headers.FindIndex(h => h.Equals("Id", StringComparison.OrdinalIgnoreCase));
                            if (nameIndex >= 0 && idIndex >= 0)
                            {
                                foreach (var line in lines.Skip(1))
                                {
                                    var values = _csvParserService.ParseCsvLine(line);
                                    if (values.Count > nameIndex && values[nameIndex].Trim().Equals(roleName, StringComparison.OrdinalIgnoreCase))
                                    {
                                        if (Guid.TryParse(values[idIndex], out var csvId))
                                        {
                                            roleId = csvId;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            catch { /* Fallback to NewGuid */ }

            Console.WriteLine($"Creating missing role via Command: {roleName}");
            var cmd = new AddRoleCommand
            {
                Id = roleId,
                Name = roleName,
                TenantId = tenantId,
                IsSuperRole = isSuperRole,
                RoleClaims = new List<POS.Data.Dto.RoleClaimDto>()
            };
            var result = await _mediator.Send(cmd);
            if (!result.Success) throw new Exception(string.Join(", ", result.Errors));
            if (result.Success) return result.Data.Id;

            role = await _roleManager.FindByNameAsync(roleName);
            return role?.Id ?? Guid.Empty;
        }

        private async Task EnsureMasterTenantAsync(string seedDataPath)
        {
            var options = _masterTenantSettings.Value;
            if (string.IsNullOrEmpty(options.SubDomain)) return; 

            var masterTenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == options.TenantId || t.Subdomain == options.SubDomain);
            
            if (masterTenant == null)
            {
                Console.WriteLine("Creating Master Tenant from settings...");
                masterTenant = new Tenant
                {
                    Id = options.TenantId,
                    Name = options.TenantName,
                    Subdomain = options.SubDomain,
                    IsActive = true,
                    CreatedDate = DateTime.UtcNow,
                    SubscriptionPlan = "Master",
                    SubscriptionStartDate = DateTime.UtcNow,
                    SubscriptionEndDate = DateTime.UtcNow.AddYears(100),
                    MaxUsers = 1000,
                    BusinessType = AppConstants.BusinessType.Retail,
                    ApiKey = options.ApiKey,
                    ApiKeyCreatedDate = DateTime.UtcNow,
                    ApiKeyEnabled = true
                };

                _context.Tenants.Add(masterTenant);
                await _context.SaveChangesAsync();

                var userId = Guid.NewGuid();
                try 
                {
                    string usersCsv = Path.Combine(seedDataPath, "Users.csv");
                    if (File.Exists(usersCsv))
                    {
                         var lines = await File.ReadAllLinesAsync(usersCsv);
                         if (lines.Length > 1) {
                             var headers = _csvParserService.ParseCsvLine(lines[0]);
                             int idIndex = headers.FindIndex(h => h.Equals("Id", StringComparison.OrdinalIgnoreCase));
                             int emailIndex = headers.FindIndex(h => h.Equals("Email", StringComparison.OrdinalIgnoreCase));
                             
                             if (idIndex >= 0 && emailIndex >= 0) {
                                 for(int i=1; i<lines.Length; i++) {
                                     var values = _csvParserService.ParseCsvLine(lines[i]);
                                     if (values.Count > emailIndex && values[emailIndex].Trim().Equals(options.AdminUser, StringComparison.OrdinalIgnoreCase)) {
                                         if (Guid.TryParse(values[idIndex], out var csvId)) {
                                             userId = csvId;
                                             Console.WriteLine($"Found Admin User in CSV. Using ID: {userId}");
                                             break;
                                         }
                                     }
                                 }
                             }
                         }
                    }
                }
                catch (Exception ex) { Console.WriteLine($"Error looking up CSV user: {ex.Message}"); }

                var adminRoleId = await GetOrCreateRoleAsync("Admin", masterTenant.Id, false, seedDataPath);
                var superAdminRoleId = await GetOrCreateRoleAsync("Super Admin", masterTenant.Id, true, seedDataPath);
                var roleIds = new List<Guid>();
                if (adminRoleId != Guid.Empty) roleIds.Add(adminRoleId);
                if (superAdminRoleId != Guid.Empty) roleIds.Add(superAdminRoleId);

                var addUserCmd = new AddUserCommand
                {
                     Id = userId, 
                     TenantId = masterTenant.Id,
                     Email = options.AdminUser,
                     UserName = options.AdminUser,
                     FirstName = "Master",
                     LastName = "Admin",
                     Password = options.AdminPassword,
                     IsActive = true,
                     IsSuperAdmin = true,
                     IsAllLocations = true,
                     RoleIds = roleIds,
                     NormalizedEmail = options.AdminUser.ToUpper(),
                     NormalizedUserName = options.AdminUser.ToUpper()
                };

                var result = await _mediator.Send(addUserCmd);
                if (!result.Success)
                {
                    Console.WriteLine($"Failed to create Master Admin via Command: {string.Join(", ", result.Errors)}");
                }
                else
                {
                    Console.WriteLine("Master Admin created successfully via AddUserCommand.");
                }

                _defaultTenantId = masterTenant.Id;
            }
            else
            {
                  _defaultTenantId = masterTenant.Id;
                  
                  var adminUser = await _userManager.FindByEmailAsync(options.AdminUser);
                  if (adminUser != null && adminUser.TenantId == masterTenant.Id)
                  {
                      var token = await _userManager.GeneratePasswordResetTokenAsync(adminUser);
                      var resetResult = await _userManager.ResetPasswordAsync(adminUser, token, options.AdminPassword);
                      if (resetResult.Succeeded)
                      {
                          Console.WriteLine($"[Fix] Reset Master Admin password via UserManager for: {options.AdminUser}");
                      }

                      bool changed = false;
                      if (!adminUser.IsSuperAdmin) 
                      { 
                          adminUser.IsSuperAdmin = true; 
                          changed = true; 
                      }
                      if (string.IsNullOrEmpty(adminUser.NormalizedEmail))
                      {
                          adminUser.NormalizedEmail = options.AdminUser.ToUpper();
                          changed = true;
                      }
                      if (string.IsNullOrEmpty(adminUser.NormalizedUserName))
                      {
                          adminUser.NormalizedUserName = options.AdminUser.ToUpper();
                          changed = true;
                      }
                      
                      if (!adminUser.IsActive)
                      {
                          adminUser.IsActive = true;
                          changed = true;
                      }

                      
                      // Ensure Master Roles are assigned
                      var rolesToAssign = new List<string> { "Admin", "Super Admin" };
                      foreach(var rName in rolesToAssign)
                      {
                          if (!await _userManager.IsInRoleAsync(adminUser, rName))
                          {
                              await _userManager.AddToRoleAsync(adminUser, rName);
                          }
                      }

                      if (changed)
                      {
                          await _userManager.UpdateAsync(adminUser);
                          Console.WriteLine($"[Fix] Updated Master Admin fields (SuperAdmin/Normalization) for: {options.AdminUser}");
                      }
                  }
            }
        }

        private async Task SeedTable<T>(string filePath) where T : class, new()
        {
            var entities = await _csvParserService.ReadCsvAsync<T>(filePath);
            if (entities == null || !entities.Any()) return;

            var properties = typeof(T).GetProperties()
                .ToDictionary(p => p.Name, p => p, StringComparer.OrdinalIgnoreCase);

            foreach (var entity in entities)
            {
                // Smart Fill logic for Tenants
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

                // Force default password and normalization for seeded users
                if (entity is User user)
                {
                    user.PasswordHash = _passwordHasher.HashPassword(user, AppConstants.Seeding.DefaultPassword);
                    user.SecurityStamp = Guid.NewGuid().ToString();
                    
                    if (string.IsNullOrEmpty(user.NormalizedEmail) && !string.IsNullOrEmpty(user.Email))
                    {
                        user.NormalizedEmail = user.Email.ToUpper();
                    }
                    if (string.IsNullOrEmpty(user.NormalizedUserName) && !string.IsNullOrEmpty(user.UserName))
            {
                user.NormalizedUserName = user.UserName.ToUpper();
            }
        }

        // Force normalization for seeded roles
        if (entity is Role role)
        {
            if (string.IsNullOrEmpty(role.NormalizedName) && !string.IsNullOrEmpty(role.Name))
            {
                role.NormalizedName = role.Name.ToUpper();
            }
        }
                
                // Smart Fill for BaseEntity dates (Multi-tenant Entities)
                if (entity is BaseEntity baseEntity)
                {
                    if (baseEntity.CreatedDate == DateTime.MinValue) baseEntity.CreatedDate = DateTime.UtcNow;
                    if (baseEntity.ModifiedDate == DateTime.MinValue) baseEntity.ModifiedDate = DateTime.UtcNow;
                }
                
                // Smart Fill for SharedBaseEntity dates (Global/Shared Entities)
                if (entity is SharedBaseEntity sharedEntity)
                {
                    if (sharedEntity.CreatedDate == DateTime.MinValue) sharedEntity.CreatedDate = DateTime.UtcNow;
                    if (sharedEntity.ModifiedDate == DateTime.MinValue) sharedEntity.ModifiedDate = DateTime.UtcNow;
                }
                
                // Auto-fill TenantId property
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
            }

            // Explicit Hierarchical sorting for self-referencing tables (ParentId)
            if (entities.Any() && entities.Count > 1)
            {
                var idProp = properties.Values.FirstOrDefault(p => p.Name.Equals("Id", StringComparison.OrdinalIgnoreCase) && p.PropertyType == typeof(Guid));
                var parentIdProp = properties.Values.FirstOrDefault(p => p.Name.Equals("ParentId", StringComparison.OrdinalIgnoreCase) && (p.PropertyType == typeof(Guid?) || p.PropertyType == typeof(Guid)));

                if (idProp != null && parentIdProp != null)
                {
                    var sortedList = new List<T>();
                    var unsortedList = entities.ToList();
                    Guid GetId(T e) => (Guid)idProp.GetValue(e);
                    Guid? GetParentId(T e)
                    {
                        var val = parentIdProp.GetValue(e);
                        if (val == null) return null;
                        if (val is Guid g) return g == Guid.Empty ? null : (Guid?)g;
                        return null;
                    }

                    var processedIds = new HashSet<Guid>();
                    int initialCount;
                    do
                    {
                        initialCount = unsortedList.Count;
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
                        else break;
                    } while (unsortedList.Count > 0 && unsortedList.Count < initialCount);

                    if (unsortedList.Any()) sortedList.AddRange(unsortedList);
                    entities = sortedList;
                }
            }

            // Incremental Seeding Logic: Filter out entities that already exist (Batch Optimized)
            if (entities.Any())
            {
                var entityTypeMetadata = _context.Model.FindEntityType(typeof(T));
                var primaryKey = entityTypeMetadata.FindPrimaryKey();
                var keyProperties = primaryKey.Properties;

                if (keyProperties.Count == 1 && (keyProperties[0].ClrType == typeof(Guid) || keyProperties[0].ClrType == typeof(int) || keyProperties[0].ClrType == typeof(long)))
                {
                    var idProp = keyProperties[0].PropertyInfo;
                    var ids = entities.Select(e => idProp.GetValue(e)).ToList();
                    
                    // For Roles and Users, also consider Name/Email as identifying constraints to avoid 23505
                    HashSet<string> existingNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                    if (typeof(T) == typeof(Role))
                    {
                        var roleNames = entities.Select(e => (string)typeof(Role).GetProperty("Name").GetValue(e)).ToList();
                        var dbNames = await _context.Roles.IgnoreQueryFilters()
                            .Where(r => roleNames.Contains(r.Name))
                            .Select(r => r.Name)
                            .ToListAsync();
                        existingNames = new HashSet<string>(dbNames, StringComparer.OrdinalIgnoreCase);
                    }
                    else if (typeof(T) == typeof(User))
                    {
                        var emails = entities.Select(e => (string)typeof(User).GetProperty("Email").GetValue(e)).ToList();
                        var dbEmails = await _context.Users.IgnoreQueryFilters()
                            .Where(u => emails.Contains(u.Email))
                            .Select(u => u.Email)
                            .ToListAsync();
                        existingNames = new HashSet<string>(dbEmails, StringComparer.OrdinalIgnoreCase);
                    }

                    if (keyProperties[0].ClrType == typeof(Guid))
                    {
                        var guidIds = ids.Cast<Guid>().ToList();
                        var existingIds = await _context.Set<T>().IgnoreQueryFilters()
                            .Select(e => EF.Property<Guid>(e, keyProperties[0].Name))
                            .Where(id => guidIds.Contains(id))
                            .ToListAsync();
                        
                        var existingIdSet = new HashSet<Guid>(existingIds);
                        entities = entities.Where(e => {
                            var id = (Guid)idProp.GetValue(e);
                            if (existingIdSet.Contains(id)) return false;
                            
                            // Secondary Name check for Roles/Users
                            if (e is Role r && existingNames.Contains(r.Name)) return false;
                            if (e is User u && existingNames.Contains(u.Email)) return false;
                            
                            return true;
                        }).ToList();
                    }
                    else if (keyProperties[0].ClrType == typeof(int))
                    {
                        var intIds = ids.Cast<int>().ToList();
                        var existingIds = await _context.Set<T>().IgnoreQueryFilters()
                            .Select(e => EF.Property<int>(e, keyProperties[0].Name))
                            .Where(id => intIds.Contains(id))
                            .ToListAsync();
                        
                        var existingSet = new HashSet<int>(existingIds);
                        entities = entities.Where(e => !existingSet.Contains((int)idProp.GetValue(e))).ToList();
                    }
                    else if (keyProperties[0].ClrType == typeof(long))
                    {
                        var longIds = ids.Cast<long>().ToList();
                        var existingIds = await _context.Set<T>().IgnoreQueryFilters()
                            .Select(e => EF.Property<long>(e, keyProperties[0].Name))
                            .Where(id => longIds.Contains(id))
                            .ToListAsync();
                        
                        var existingSet = new HashSet<long>(existingIds);
                        entities = entities.Where(e => !existingSet.Contains((long)idProp.GetValue(e))).ToList();
                    }
                    else 
                    {
                        var newEntities = new List<T>();
                        foreach (var entity in entities)
                        {
                            var idVal = idProp.GetValue(entity);
                            var existing = await _context.Set<T>().IgnoreQueryFilters()
                                .FirstOrDefaultAsync(e => EF.Property<object>(e, keyProperties[0].Name).Equals(idVal)); 
                            if (existing == null) newEntities.Add(entity);
                        }
                        entities = newEntities;
                    }
                }
                else
                {
                    // Fallback for composite keys or other types
                    var newEntities = new List<T>();
                    foreach (var entity in entities)
                    {
                        try
                        {
                            var keyValues = keyProperties.Select(p => p.PropertyInfo.GetValue(entity)).ToArray();
                            // Composite key check is more complex, fallback to a simple any check or just try/catch the insert
                            // For seeding, usually PKs are single IDs. If composite, we can skip optimization or use a smarter approach.
                            // Let's use a basic 'Any' check with filters ignored.
                            var query = _context.Set<T>().IgnoreQueryFilters();
                            // This part is tricky generic-wise. For now, let's just use FindAsync and hope for the best, 
                            // or accept that composite keys might hit the catch block on insert.
                            var existing = await _context.Set<T>().FindAsync(keyValues);
                            if (existing == null) newEntities.Add(entity);
                        }
                        catch { newEntities.Add(entity); }
                    }
                    entities = newEntities;
                }
            }

            if (entities.Any())
            {
                 var provider = _context.Database.ProviderName;
                 var entityTypeMetadata = _context.Model.FindEntityType(typeof(T));
                 var tableName = entityTypeMetadata.GetTableName();
                 var schema = entityTypeMetadata.GetSchema();
                 var fullTableName = string.IsNullOrEmpty(schema) ? $"[{tableName}]" : $"[{schema}].[{tableName}]";

                 bool isSqlServer = provider == AppConstants.DatabaseProviders.SqlServer;
                 bool isPostgres = provider.Contains(AppConstants.DatabaseProviders.PostgreSql, StringComparison.OrdinalIgnoreCase);

                 bool hasIdentity = isSqlServer && entityTypeMetadata.GetProperties().Any(p => 
                        (p.Name.Equals("Id", StringComparison.OrdinalIgnoreCase)) && 
                        (p.ClrType == typeof(int) || p.ClrType == typeof(long)));
                
                 bool hasPostgresIdentity = isPostgres && entityTypeMetadata.GetProperties().Any(p =>
                        (p.Name.Equals("Id", StringComparison.OrdinalIgnoreCase)) &&
                        (p.ClrType == typeof(int) || p.ClrType == typeof(long)));

                 var strategy = _context.Database.CreateExecutionStrategy();
                 await strategy.ExecuteAsync(async () =>
                 {
                     using (var transaction = await _context.Database.BeginTransactionAsync())
                     {
                         try
                         {
                            // Ensure FK checks are disabled for this transaction (Crucial for Postgres/Cloud)
                            await _dbUtilityService.DisableForeignKeyCheckAsync(_context);

                            if (hasIdentity) await _context.Database.ExecuteSqlRawAsync($"SET IDENTITY_INSERT {fullTableName} ON");

                            _context.ChangeTracker.AutoDetectChangesEnabled = false;
                            await _context.Set<T>().AddRangeAsync(entities);
                            await _context.SaveChangesAsync();
                            _context.ChangeTracker.AutoDetectChangesEnabled = true;

                            if (hasIdentity) await _context.Database.ExecuteSqlRawAsync($"SET IDENTITY_INSERT {fullTableName} OFF");

                            if (hasPostgresIdentity)
                            {
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
                             if (hasIdentity) try { await _context.Database.ExecuteSqlRawAsync($"SET IDENTITY_INSERT {fullTableName} OFF"); } catch { }
                         }
                         finally
                         {
                             _context.ChangeTracker.Clear();
                             _context.ChangeTracker.AutoDetectChangesEnabled = true;
                         }
                     }
                 });
            }
        }

        private Guid? _defaultTenantId;
    }
}
