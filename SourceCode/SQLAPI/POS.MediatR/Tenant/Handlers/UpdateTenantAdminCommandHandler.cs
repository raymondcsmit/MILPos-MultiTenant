using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using POS.Common.GenericRepository;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Helper;
using POS.MediatR.Tenant.Commands;
using POS.Repository;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Tenant.Handlers
{
    public class UpdateTenantAdminCommandHandler : IRequestHandler<UpdateTenantAdminCommand, ServiceResponse<bool>>
    {
        private readonly IGenericRepository<POS.Data.Entities.Tenant> _tenantRepository;
        private readonly UserManager<User> _userManager;
        private readonly RoleManager<Role> _roleManager;

        public UpdateTenantAdminCommandHandler(
            IGenericRepository<POS.Data.Entities.Tenant> tenantRepository,
            UserManager<User> userManager,
            RoleManager<Role> roleManager)
        {
            _tenantRepository = tenantRepository;
            _userManager = userManager;
            _roleManager = roleManager;
        }

        public async Task<ServiceResponse<bool>> Handle(UpdateTenantAdminCommand request, CancellationToken cancellationToken)
        {
            var tenant = await _tenantRepository.FindAsync(request.TenantId);
            if (tenant == null)
            {
                return ServiceResponse<bool>.ReturnFailed(404, "Tenant not found");
            }
            var requestUserName = request.AdminEmail.ToUpper();
            var user = await _userManager.Users.IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.NormalizedUserName == requestUserName, cancellationToken);

            if (user == null)
            {
                user = await _userManager.Users.IgnoreQueryFilters()
                   .FirstOrDefaultAsync(u => u.NormalizedEmail == requestUserName, cancellationToken);
            }
            //var user = await _userManager.FindByEmailAsync(request.AdminEmail)?? _userManager.Users.Where(us=>us.Email== request.AdminEmail||us.NormalizedEmail==request.AdminEmail.ToUpper()).FirstOrDefault();
            if (user != null)
            {
                // User exists, check if belongs to this tenant
                if (user.TenantId != request.TenantId)
                {
                    return ServiceResponse<bool>.ReturnFailed(400, "User with this email exists in another tenant.");
                }

                // Update password if provided
                if (!string.IsNullOrEmpty(request.NewPassword))
                {
                    var token = await _userManager.GeneratePasswordResetTokenAsync(user);
                    var result = await _userManager.ResetPasswordAsync(user, token, request.NewPassword);
                    if (!result.Succeeded)
                    {
                        return ServiceResponse<bool>.ReturnFailed(400, string.Join(", ", result.Errors.Select(e => e.Description)));
                    }
                }

                // Ensure user has Admin role
                if (!await _userManager.IsInRoleAsync(user, "Admin"))
                {
                    await _userManager.AddToRoleAsync(user, "Admin");
                }

                return ServiceResponse<bool>.ReturnResultWith200(true);
            }
            else
            {
                // Create new user
                if (string.IsNullOrEmpty(request.NewPassword))
                {
                    return ServiceResponse<bool>.ReturnFailed(400, "Password is required for new user");
                }

                user = new User
                {
                    UserName = request.AdminEmail,
                    Email = request.AdminEmail,
                    FirstName = "Admin",
                    LastName = "User",
                    TenantId = request.TenantId,
                    IsActive = true,
                    EmailConfirmed = true // Auto confirm for admin created by superadmin
                };

                var result = await _userManager.CreateAsync(user, request.NewPassword);
                if (!result.Succeeded)
                {
                    return ServiceResponse<bool>.ReturnFailed(400, string.Join(", ", result.Errors.Select(e => e.Description)));
                }

                await _userManager.AddToRoleAsync(user, "Admin");

                return ServiceResponse<bool>.ReturnResultWith200(true);
            }
        }
    }
}
