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

var builder = WebApplication.CreateBuilder(args);
ExcelPackage.License.SetNonCommercialOrganization("MIL POS");
//ExcelPackage.License.LicenseContext = LicenseContext.NonCommercial; // Set license globally
builder.Services.AddTransient<JobService>();
builder.Services.AddMemoryCache();


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
        configuration.UsePostgreSqlStorage(options =>
            options.UseNpgsqlConnection(connectionString));
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
    using (var serviceScope = app.Services.GetService<IServiceScopeFactory>().CreateScope())
    {
        var context = serviceScope.ServiceProvider.GetRequiredService<POSDbContext>();
        context.Database.Migrate();

        // Seed data using SeedingService
        var seedingEnabled = builder.Configuration.GetValue<bool>("SeedingConfig:Enabled", true);
        if (seedingEnabled)
        {
            var seedingService = serviceScope.ServiceProvider.GetRequiredService<SeedingService>();
            await seedingService.SeedAsync();
        }
    }
}
catch (System.Exception ex)
{
    // Log error but allow app to start if possible, or rethrow
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogError(ex, "An error occurred while upgrading the database.");
    // throw; // Prevent crash to allow debugging
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
