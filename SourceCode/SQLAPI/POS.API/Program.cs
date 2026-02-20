using Hangfire;
using Hangfire.SqlServer;
using Hangfire.MemoryStorage;
using Hangfire.Storage.SQLite;
using Hangfire.PostgreSql; // Added for PostgreSQL support
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using NLog;
using NLog.Web;
using POS.API;
using POS.API.Helpers;
using POS.Domain;
using System;
using System.IO;

using OfficeOpenXml; // Add this namespace
using System.Linq;
using System.Threading.Tasks;

var builder = WebApplication.CreateBuilder(args);
ExcelPackage.License.SetNonCommercialOrganization("MIL POS");
//ExcelPackage.License.LicenseContext = LicenseContext.NonCommercial; // Set license globally
builder.Services.AddTransient<JobService>();
builder.Services.AddMemoryCache();

// Electron-specific configuration override via environment variables
var tenantIdEnv = Environment.GetEnvironmentVariable("TENANT_ID");
var apiKeyEnv = Environment.GetEnvironmentVariable("API_KEY");
var cloudApiUrlEnv = Environment.GetEnvironmentVariable("CLOUD_API_URL");

if (!string.IsNullOrEmpty(tenantIdEnv)) builder.Configuration["TenantId"] = tenantIdEnv;
if (!string.IsNullOrEmpty(apiKeyEnv)) builder.Configuration["ApiKey"] = apiKeyEnv;
if (!string.IsNullOrEmpty(cloudApiUrlEnv)) builder.Configuration["SyncSettings:CloudApiUrl"] = cloudApiUrlEnv;


builder.Logging.ClearProviders();
builder.Host.UseNLog();

var provider = builder.Configuration.GetValue<string>("DatabaseProvider");
if (provider == "Sqlite")
{
    LogManager.Setup().LoadConfigurationFromFile("nlog.sqlite.config");
}

var startup = new Startup(builder.Configuration);

startup.ConfigureServices(builder.Services);

// Add Hangfire services.
builder.Services.AddHangfire(configuration =>
{
    configuration
        .SetDataCompatibilityLevel(CompatibilityLevel.Version_170)
        .UseSimpleAssemblyNameTypeSerializer()
        .UseRecommendedSerializerSettings();

    if (provider == "Sqlite")
    {
        var sqliteconnectionString = builder.Configuration.GetConnectionString("SqliteHangfirConnectionString");
        
        var env = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
        if (env == "Desktop")
        {
             var appDataPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "milpos");
             if (!Directory.Exists(appDataPath))
             {
                 Directory.CreateDirectory(appDataPath);
             }
             var dbPath = Path.Combine(appDataPath, "HangFireDB.db");
             sqliteconnectionString = dbPath;
        }

        configuration.UseSQLiteStorage(sqliteconnectionString);
    }
    else if (provider == "PostgreSql")
    {
        var connectionString = builder.Configuration.GetConnectionString("PostgresConnectionString");
        var options = new PostgreSqlStorageOptions
        {
            DistributedLockTimeout = TimeSpan.FromMinutes(1),
            PrepareSchemaIfNecessary = true,
            QueuePollInterval = TimeSpan.FromSeconds(15)
        };
        configuration.UsePostgreSqlStorage(connectionString, options);
    }
    else
    {
        var connectionString = builder.Configuration.GetConnectionString("DbConnectionString");
        configuration.UseSqlServerStorage(connectionString, new SqlServerStorageOptions
        {
            CommandBatchMaxTimeout = TimeSpan.FromMinutes(5),
            SlidingInvisibilityTimeout = TimeSpan.FromMinutes(5),
            QueuePollInterval = TimeSpan.Zero,
            UseRecommendedIsolationLevel = true,
            DisableGlobalLocks = true,
            JobExpirationCheckInterval = TimeSpan.FromHours(1)
        });
    }
});

builder.Services.AddHangfireServer(options =>
{
    options.WorkerCount = Environment.ProcessorCount * 5;
    options.Queues = new[] { "default", "cleanup", "reminder" };
    options.ServerCheckInterval = TimeSpan.FromMinutes(1);
    options.SchedulePollingInterval = TimeSpan.FromSeconds(15);
    options.CancellationCheckInterval = TimeSpan.FromSeconds(5);
});

// Add the processing server as IHostedService
builder.Services.AddHangfireServer();

var app = builder.Build();

try
{
    using (var scope = app.Services.CreateScope())
    {
        try
        {
            var services = scope.ServiceProvider;
            var context = services.GetRequiredService<POSDbContext>();
            var seedingService = services.GetRequiredService<SeedingService>();

            context.Database.Migrate();

            // Seed data using SeedingService
            var seedingEnabled = builder.Configuration.GetValue<bool>("SeedingConfig:Enabled", true);
            if (seedingEnabled)
            {
                await seedingService.SeedAsync();
            }

            // --- START DIAGNOSTICS ---
            Console.WriteLine("--- SEEDING DIAGNOSTICS ---");
            var adminUser = await context.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Email == "admin@gmail.com");
            if (adminUser != null)
            {
                var userRoles = await context.UserRoles.IgnoreQueryFilters()
                    .Where(ur => ur.UserId == adminUser.Id)
                    .Join(context.Roles.IgnoreQueryFilters(), ur => ur.RoleId, r => r.Id, (ur, r) => r.Name)
                    .ToListAsync();
                Console.WriteLine($"Admin: {adminUser.Email}, Normalized: {adminUser.NormalizedEmail}, Active: {adminUser.IsActive}, Roles: {string.Join(", ", userRoles)}");
            }
            else { Console.WriteLine("Admin NOT FOUND."); }
            Console.WriteLine("--- END DIAGNOSTICS ---");
        }
        catch (Exception ex)
        {
            var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
            logger.LogError(ex, "An error occurred during migration or seeding.");
        }
    }
}
catch (System.Exception ex)
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogError(ex, "An error occurred while upgrading the database.");
}

ILoggerFactory loggerFactory = app.Services.GetRequiredService<ILoggerFactory>();
startup.Configure(app, app.Environment, loggerFactory);

app.UseHangfireDashboard();

app.UseEndpoints(endpoints =>
{
    endpoints.MapHangfireDashboard();
});

JobService jobService = app.Services.GetRequiredService<JobService>();
jobService.StartScheduler();
app.Lifetime.ApplicationStarted.Register(() =>
{
    var addresses = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()?.Addresses;
    if (addresses != null)
    {
        foreach (var address in addresses)
        {
            Console.WriteLine($"Application is running on: {address}");
        }
    }
});
app.Run();
