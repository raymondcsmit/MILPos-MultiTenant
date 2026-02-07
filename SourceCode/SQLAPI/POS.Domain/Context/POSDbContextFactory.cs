using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using System.IO;
using System;

namespace POS.Domain
{
    /// <summary>
    /// Design-time factory for POSDbContext to enable EF Core migrations
    /// </summary>
    public class POSDbContextFactory : IDesignTimeDbContextFactory<POSDbContext>
    {
        public POSDbContext CreateDbContext(string[] args)
        {
            // Build configuration
            var configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false)
                .AddJsonFile("appsettings.Development.json", optional: true)
                .AddJsonFile("appsettings.Desktop.json", optional: true)
                .AddCommandLine(args)
                .Build();

            var provider = configuration.GetValue<string>("DatabaseProvider") ?? "Sqlite";
            var optionsBuilder = new DbContextOptionsBuilder<POSDbContext>();

            if (provider == "Sqlite")
            {
                 var connectionString = configuration.GetConnectionString("SqliteConnectionString") ?? "Data Source=pos.db";
                 optionsBuilder.UseSqlite(connectionString, b => b.MigrationsAssembly("POS.Migrations.Sqlite"));
            }
            else if (provider == "PostgreSql")
            {
                 var connectionString = configuration.GetConnectionString("PostgresConnectionString");
                 AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
                 optionsBuilder.UseNpgsql(connectionString, b => b.MigrationsAssembly("POS.Migrations.PostgreSQL"));
            }
            else
            {
                 var connectionString = configuration.GetConnectionString("DbConnectionString");
                 optionsBuilder.UseSqlServer(connectionString, b => b.MigrationsAssembly("POS.Migrations.SqlServer"));
            }

            // Create a single tenant provider for design-time
            var tenantProvider = new SingleTenantProvider();

            return new POSDbContext(optionsBuilder.Options, tenantProvider);
        }
    }
}
