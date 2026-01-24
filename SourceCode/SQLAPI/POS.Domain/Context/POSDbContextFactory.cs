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
                .AddJsonFile("appsettings.Desktop.json", optional: true)
                .Build();

            // Get connection string (default to SQLite for migrations)
            var connectionString = configuration.GetConnectionString("SqliteConnectionString")
                ?? "Data Source=pos.db";

            // Create options
            var optionsBuilder = new DbContextOptionsBuilder<POSDbContext>();
            optionsBuilder.UseSqlite(connectionString);

            // Create a single tenant provider for design-time
            var tenantProvider = new SingleTenantProvider();

            return new POSDbContext(optionsBuilder.Options, tenantProvider);
        }
    }
}
