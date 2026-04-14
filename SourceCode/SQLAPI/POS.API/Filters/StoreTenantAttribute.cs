using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Linq;
using Microsoft.Extensions.DependencyInjection;
using POS.API.Services;
using POS.Data.Entities;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.Data;      // Added for POSDbContext
using POS.Domain;    // Added for ITenantProvider

namespace POS.API.Filters
{
    public class StoreTenantAttribute : ActionFilterAttribute
    {
        public override async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var tenantName = context.RouteData.Values["tenantName"]?.ToString();
            
            if (string.IsNullOrEmpty(tenantName))
            {
                await next();
                return;
            }

            // Resolve Tenant from DB
            var dbContext = context.HttpContext.RequestServices.GetService<POSDbContext>();
            var tenant = await dbContext.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Name == tenantName || t.Subdomain == tenantName);

            if (tenant == null)
            {
                context.Result = new NotFoundObjectResult($"Store '{tenantName}' not found.");
                return;
            }

            // Set Tenant Provider Context
            var tenantProvider = context.HttpContext.RequestServices.GetService<ITenantProvider>();
            tenantProvider?.SetTenantId(tenant.Id);
            
            // Pass Tenant to Controller
            if (context.Controller is Controller controller)
            {
                controller.ViewBag.Tenant = tenant;
                controller.ViewBag.TenantName = tenant.Name;
            }

            await next();
        }
    }
}
