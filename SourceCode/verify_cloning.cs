using Microsoft.EntityFrameworkCore;
using POS.Data;
using POS.Domain;
using System;
using System.Linq;
using System.Threading.Tasks;

public class VerifyCloning
{
    public static async Task Run(POSDbContext context)
    {
        var tenantId = Guid.Parse("1de5ded2-7e17-4d66-9416-dad99b502d94");
        var tenant = await context.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == tenantId);
        
        if (tenant == null)
        {
            Console.WriteLine("Tenant NOT FOUND.");
            return;
        }
        Console.WriteLine($"Tenant Found: {tenant.Name} ({tenant.Subdomain})");

        // Check Categories
        var categories = await context.ProductCategories.IgnoreQueryFilters()
            .Where(c => c.TenantId == tenantId)
            .CountAsync();
        Console.WriteLine($"Product Categories: {categories}");

        // Check Products
        var products = await context.Products.IgnoreQueryFilters()
            .Where(p => p.TenantId == tenantId)
            .CountAsync();
        Console.WriteLine($"Products: {products}");
        
        // Check Brands
        var brands = await context.Brands.IgnoreQueryFilters()
            .Where(b => b.TenantId == tenantId)
            .CountAsync();
        Console.WriteLine($"Brands: {brands}");
    }
}
