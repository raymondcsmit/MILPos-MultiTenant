using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using System.IO;

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
                .Build();

            var provider = configuration.GetValue<string>("DatabaseProvider") ?? "Sqlite";
            var optionsBuilder = new DbContextOptionsBuilder<POSDbContext>();

            if (provider == "Sqlite")
            {
                 var connectionString = configuration.GetConnectionString("SqliteConnectionString") ?? "Data Source=pos.db";
                 optionsBuilder.UseSqlite(connectionString);
            }
            else
            {
                 var connectionString = configuration.GetConnectionString("DbConnectionString");
                 optionsBuilder.UseSqlServer(connectionString);
            }

            // Create a single tenant provider for design-time
            var tenantProvider = new SingleTenantProvider();

            return new POSDbContext(optionsBuilder.Options, tenantProvider);
        }
    }
}
