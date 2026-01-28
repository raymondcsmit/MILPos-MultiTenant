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
                .Build();

            var provider = configuration["DatabaseProvider"] ?? "SqlServer";
            var connectionString = configuration.GetConnectionString(provider == "Sqlite" ? "SqliteConnectionString" : "DbConnectionString");

            if (string.Equals(provider, "Sqlite", StringComparison.OrdinalIgnoreCase))
            {
                optionsBuilder.UseSqlite(connectionString, b => b.MigrationsAssembly("POS.Migrations.Sqlite"));
            }
            else
            {
                optionsBuilder.UseSqlServer(connectionString, b => b.MigrationsAssembly("POS.Migrations.SqlServer"));
            }

            return new POSDbContext(optionsBuilder.Options, new SingleTenantProvider());
        }
    }
}
