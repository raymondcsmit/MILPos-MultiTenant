using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Helper;
using POS.MediatR.Tenant.Commands;
using POS.Repository;
using POS.Common.GenericRepository;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Tenant.Handlers
{
    public class SwitchTenantCommandHandler : IRequestHandler<SwitchTenantCommand, ServiceResponse<UserAuthDto>>
    {
        private readonly IGenericRepository<POS.Data.Entities.Tenant> _tenantRepository;
        private readonly UserManager<User> _userManager;
        private readonly IUserRepository _userRepository;

        public SwitchTenantCommandHandler(
            IGenericRepository<POS.Data.Entities.Tenant> tenantRepository,
            UserManager<User> userManager,
            IUserRepository userRepository)
        {
            _tenantRepository = tenantRepository;
            _userManager = userManager;
            _userRepository = userRepository;
        }

        public async Task<ServiceResponse<UserAuthDto>> Handle(SwitchTenantCommand request, CancellationToken cancellationToken)
        {
            var targetTenant = await _tenantRepository.All.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == request.TenantId, cancellationToken);
            if (targetTenant == null) return ServiceResponse<UserAuthDto>.ReturnFailed(404, "Target tenant not found.");

            if (!targetTenant.IsActive) return ServiceResponse<UserAuthDto>.ReturnFailed(400, "Cannot switch to an inactive tenant.");

            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null) return ServiceResponse<UserAuthDto>.ReturnFailed(401, "User not found.");

            // Create a fake/impersonated user object with the target TenantId
            // But BuildUserAuthObject uses the user's properties.
            // We need to generate a token that has the NEW TenantId.
            // _userRepository.BuildUserAuthObject generates the token based on the user entity passed to it.
            // If we want to switch tenant, we might need to separate the token generation or modify the user entity temporarily.
            // BUT: The token is generated inside BuildUserAuthObject.
            // And BuildUserAuthObject uses appUser.TenantId to get CompanyProfile etc.
            
            // NOTE: The architecture likely expects the user to belong to the tenant. 
            // Super Admin IMPERSONATION means we want a token AS IF the user is in that tenant.
            // We can create a clone of the user, change the TenantId, and pass it to BuildUserAuthObject?
            // Or we check how BuildUserAuthObject works. It uses appUser.TenantId.
            
            // Let's create a clone/copy of the user to avoid tracking changes in EF
            var impersonatedUser = new User
            {
                Id = user.Id,
                UserName = user.UserName,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                TenantId = targetTenant.Id, // SUPER IMPORTANT: This creates the "Switch"
                IsAllLocations = true // Super Admin usually has access to all locations
                // Add other necessary properties
            };

            // We need to bypass some checks in BuildUserAuthObject that might look at the DB for this specific user+tenant combo if it doesn't exist?
            // UserAuthObject looks up CompanyProfile by appUser.TenantId. This will work (it gets the target tenant's profile).
            // It looks up Locations. If IsAllLocations is true, it gets all locations for that TenantId.
            
            var authDto = await _userRepository.BuildUserAuthObject(impersonatedUser);
            
            // Correct the Roles/Claims if needed. Super Admin should probably keep Super Admin role?
            // OR should they become admin of the target tenant?
            // Usually SuperAdmin stays SuperAdmin but in the context of the new tenant.
            
            return ServiceResponse<UserAuthDto>.ReturnResultWith200(authDto);
        }
    }
}
