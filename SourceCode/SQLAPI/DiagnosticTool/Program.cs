using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using POS.Data;
using POS.Data.Entities;
using POS.Domain.Context;
using System;
using System.Linq;
using System.Threading.Tasks;

class Program
{
    static async Task Main(string[] args)
    {
        var configuration = new ConfigurationBuilder()
            .SetBasePath(System.IO.Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json")
            .Build();

        var services = new ServiceCollection();
        
        var connectionString = configuration.GetConnectionString("PostgresConnectionString");
        services.AddDbContext<POSDbContext>(options =>
            options.UseNpgsql(connectionString, b => b.MigrationsAssembly("POS.Migrations.PostgreSQL")));

        var serviceProvider = services.BuildServiceProvider();

        using (var scope = serviceProvider.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<POSDbContext>();
            
            Console.WriteLine("--- TENANTS ---");
            var tenants = await context.Tenants.IgnoreQueryFilters().ToListAsync();
            foreach (var t in tenants)
            {
                Console.WriteLine($"Tenant: {t.Name} ({t.Subdomain}) ID: {t.Id}");
            }

            Console.WriteLine("\n--- USERS ---");
            var users = await context.Users.IgnoreQueryFilters().ToListAsync();
            foreach (var u in users)
            {
                Console.WriteLine($"User: {u.UserName} Email: {u.Email} Tenant: {u.TenantId} IsActive: {u.IsActive} IsSuperAdmin: {u.IsSuperAdmin}");
            }
        }
    }
}
