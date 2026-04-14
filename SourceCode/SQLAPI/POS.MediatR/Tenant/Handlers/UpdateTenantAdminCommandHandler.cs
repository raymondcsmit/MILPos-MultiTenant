using POS.Helper;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using POS.Common.GenericRepository;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Helper;
using POS.MediatR.CommandAndQuery;
using POS.MediatR.Tenant.Commands;
using POS.Repository;
using System;
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
        private readonly IMediator _mediator;

        public UpdateTenantAdminCommandHandler(
            IGenericRepository<POS.Data.Entities.Tenant> tenantRepository,
            UserManager<User> userManager,
            RoleManager<Role> roleManager,
            IMediator mediator)
        {
            _tenantRepository = tenantRepository;
            _userManager = userManager;
            _roleManager = roleManager;
            _mediator = mediator;
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
                // Create new user via Command
                if (string.IsNullOrEmpty(request.NewPassword))
                {
                    return ServiceResponse<bool>.ReturnFailed(400, "Password is required for new user");
                }

                var addUserCmd = new AddUserCommand
                {
                    Email = request.AdminEmail,
                    UserName = request.AdminEmail,
                    FirstName = "Admin",
                    LastName = "User",
                    Password = request.NewPassword,
                    TenantId = request.TenantId,
                    IsActive = true,
                    // Role assignment handled below to ensure consistency
                };

                var result = await _mediator.Send(addUserCmd, cancellationToken);
                if (!result.Success)
                {
                    return ServiceResponse<bool>.ReturnFailed(400, string.Join(", ", result.Errors));
                }

                // Assign Role
                user = await _userManager.FindByIdAsync(result.Data.Id.ToString());
                if (user != null) 
                {
                    await _userManager.AddToRoleAsync(user, "Admin");
                }

                return ServiceResponse<bool>.ReturnResultWith200(true);
            }
        }
    }
}

