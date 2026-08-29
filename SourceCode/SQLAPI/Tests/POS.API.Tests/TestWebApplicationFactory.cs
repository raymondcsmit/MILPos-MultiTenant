using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using POS.Domain;

namespace POS.API.Tests;

/// <summary>
/// Boots the real POS.API in-process on an isolated SQLite database (one DB per factory instance / test class).
/// Program.cs runs EF migrations on startup; application seeding is disabled — tests use <see cref="Infra.TestSeed"/>
/// which creates the canonical deterministic dataset (tenant, users, chart of accounts, products).
/// TC traceability: infrastructure for all TC-Dxx integration cases.
/// </summary>
public sealed class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _dbPath = Path.Combine(Path.GetTempPath(), $"milpos_test_{Guid.NewGuid():N}.db");
    private readonly SemaphoreSlim _seedLock = new(1, 1);
    private Task<bool>? _seedTask;

    public string DbPath => _dbPath;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        // NOTE: for minimal-hosting apps (top-level statements), ConfigureAppConfiguration callbacks run
        // BEFORE appsettings.*.json sources are added, so file settings would override them.
        // UseSetting writes host-level settings that always win — required to force SQLite and
        // keep tests off the cloud Postgres host configured in appsettings.Development.json.
        builder.UseSetting("DatabaseProvider", "Sqlite");
        builder.UseSetting("ConnectionStrings:SqliteConnectionString", $"Data Source={_dbPath}");
        // Hangfire's SQLite storage expects a bare file path, not a "Data Source=" connection string.
        builder.UseSetting("ConnectionStrings:SqliteHangfirConnectionString", _dbPath);
        builder.UseSetting("SeedingConfig:Enabled", "false");
        builder.UseSetting("TenantId", Infra.TestIds.TenantAId.ToString());
        // Audit interceptor stamps CreatedBy from this id; it must reference an existing seeded user
        // (FK_CompanyProfiles_Users_CreatedBy and every other audited-table FK).
        builder.UseSetting("DefaultUser:DefaultUserId", Infra.TestIds.AdminUserId.ToString());
    }

    /// <summary>
    /// Ensures the server is started and the canonical test dataset is seeded exactly once per factory.
    /// </summary>
    public async Task EnsureSeededAsync()
    {
        // Touch the server so Program.cs migrations run before seeding.
        _ = CreateClient();

        if (_seedTask is { IsCompletedSuccessfully: true }) return;

        await _seedLock.WaitAsync();
        try
        {
            _seedTask ??= SeedCoreAsync();
            await _seedTask;
        }
        finally
        {
            _seedLock.Release();
        }
    }

    private async Task<bool> SeedCoreAsync()
    {
        using var scope = Services.CreateScope();
        var seed = new Infra.TestSeed(scope.ServiceProvider);
        await seed.SeedAsync();
        return true;
    }

    /// <summary>
    /// Runs an assertion block against a fresh, tracked <see cref="POSDbContext"/> scope.
    /// </summary>
    public async Task UsingDbAsync(Func<POSDbContext, Task> assertion)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<POSDbContext>();
        await assertion(context);
    }

    /// <summary>
    /// Runs a query block against a fresh <see cref="POSDbContext"/> scope and returns the result.
    /// </summary>
    public async Task<T> UsingDbAsync<T>(Func<POSDbContext, Task<T>> query)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<POSDbContext>();
        return await query(context);
    }

    public T GetRequiredService<T>() where T : notnull =>
        Services.CreateScope().ServiceProvider.GetRequiredService<T>();

    protected override void Dispose(bool disposing)
    {
        // Hangfire's SQLite storage races the host shutdown and can throw during connection teardown;
        // a fixture cleanup failure would fail every test in the class, so teardown errors are swallowed.
        try
        {
            base.Dispose(disposing);
        }
        catch (Exception)
        {
        }
        try
        {
            if (File.Exists(_dbPath)) File.Delete(_dbPath);
            if (File.Exists(_dbPath + "-shm")) File.Delete(_dbPath + "-shm");
            if (File.Exists(_dbPath + "-wal")) File.Delete(_dbPath + "-wal");
        }
        catch (Exception)
        {
            // File may still be locked during teardown; temp folder cleans up eventually.
        }
    }
}
