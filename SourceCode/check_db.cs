using Microsoft.EntityFrameworkCore;
using POS.Data;
using POS.Domain;
using System;
using System.Linq;
using System.Threading.Tasks;

public class DbCheck
{
    public static async Task Run(POSDbContext context)
    {
        var admin = await context.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Email == "admin@gmail.com");
        if (admin == null)
        {
            Console.WriteLine("Admin user NOT FOUND.");
            return;
        }
        Console.WriteLine($"Admin: {admin.Email}, Normalized: {admin.NormalizedEmail}, Active: {admin.IsActive}, Super: {admin.IsSuperAdmin}, Tenant: {admin.TenantId}");
        
        var roles = await context.UserRoles.IgnoreQueryFilters()
            .Where(ur => ur.UserId == admin.Id)
            .Join(context.Roles.IgnoreQueryFilters(), ur => ur.RoleId, r => r.Id, (ur, r) => r.Name)
            .ToListAsync();
        Console.WriteLine($"Roles: {string.Join(", ", roles)}");
    }
}
