using Microsoft.AspNetCore.Authorization;
using System.Threading.Tasks;

namespace POS.API.Authorization
{
    public class SuperAdminRequirement : IAuthorizationRequirement
    {
    }

    public class SuperAdminHandler : AuthorizationHandler<SuperAdminRequirement>
    {
        protected override Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            SuperAdminRequirement requirement)
        {
            // Check if user has isSuperAdmin claim set to true
            var isSuperAdminClaim = context.User.FindFirst("isSuperAdmin");
            
            if (isSuperAdminClaim != null && isSuperAdminClaim.Value == "true")
            {
                context.Succeed(requirement);
            }

            return Task.CompletedTask;
        }
    }
}
