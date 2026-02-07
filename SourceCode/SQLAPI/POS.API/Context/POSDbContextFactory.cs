using System;
using System.IO;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using POS.Domain;

namespace POS.API.Context
{
    public class POSDbContextFactory : IDesignTimeDbContextFactory<POSDbContext>
    {
        public POSDbContext CreateDbContext(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<POSDbContext>();
            
            // Build configuration
            IConfigurationRoot configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json")
                .AddJsonFile($"appsettings.{Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development"}.json", optional: true)
                .AddEnvironmentVariables()
                .AddCommandLine(args)
                .Build();

            var provider = configuration["DatabaseProvider"] ?? "SqlServer";
            
            if (string.Equals(provider, "Sqlite", StringComparison.OrdinalIgnoreCase))
            {
                 var connectionString = configuration.GetConnectionString("SqliteConnectionString");
                 optionsBuilder.UseSqlite(connectionString, b => b.MigrationsAssembly("POS.Migrations.Sqlite"));
            }
            else if (string.Equals(provider, "PostgreSql", StringComparison.OrdinalIgnoreCase))
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

            return new POSDbContext(optionsBuilder.Options, new SingleTenantProvider());
        }
    }
}
