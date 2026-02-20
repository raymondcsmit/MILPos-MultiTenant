using AutoMapper;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Domain;
using POS.MediatR.CommandAndQuery;
using POS.Repository;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading;
using System.Threading.Tasks;
using POS.Helper;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Identity;
using System.Linq;

namespace POS.MediatR.Handlers
{
    public class AddRoleCommandHandler : IRequestHandler<AddRoleCommand, ServiceResponse<RoleDto>>
    {
        private readonly RoleManager<Role> _roleManager;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly IMapper _mapper;
        private readonly UserInfoToken _userInfoToken;
        private readonly ILogger<AddRoleCommandHandler> _logger;

        public AddRoleCommandHandler(
            RoleManager<Role> roleManager,
            IMapper mapper,
            IUnitOfWork<POSDbContext> uow,
            UserInfoToken userInfoToken,
            ILogger<AddRoleCommandHandler> logger
            )
        {
            _roleManager = roleManager;
            _mapper = mapper;
            _uow = uow;
            _userInfoToken = userInfoToken;
            _logger = logger;
        }
        public async Task<ServiceResponse<RoleDto>> Handle(AddRoleCommand request, CancellationToken cancellationToken)
        {
            // Check existence logic using RoleManager (Note: FindByNameAsync might be scoped to tenant if configured, but usually global)
            // However, Role Names are usually unique per Tenant. Identity doesn't natively handle Tenant scoping well without custom store.
            // But we can check manually? Or trust RoleManager.
            // Let's use our current pattern: Check existing by Name (and possibly TenantId if we could, but Name is usually unique in request context)
            
            // NOTE: The previous code did simple FindBy Name.
            // We should ideally check within Tenant scope if multi-tenant.
            // For now, let's use RoleManager.RoleExistsAsync which checks NormalizedName.
            
            bool exists = await _roleManager.RoleExistsAsync(request.Name);
            if (exists)
            {
                // This might be a false positive if roles are tenant-scoped but share names? 
                // But typically Role Name should be unique or we rely on Custom Validator.
                // Reverting to repository check for tenant-scoped uniqueness might be safer IF names are duplicated across tenants.
                // But IdentityRole<Guid> usually implies global uniqueness on NormalizedName unless Multitenant Store is used.
                // Given previous code: _roleRepository.FindBy(c => c.Name == request.Name) <-- This was global check!
                
                _logger.LogError("Role Name already exist.");
                return ServiceResponse<RoleDto>.Return409("Role Name already exist.");
            }

            request.RoleClaims.ForEach(rc => rc.ClaimType = rc.ClaimType.Trim().Replace(" ", "_"));
            
            var entity = new Role
            {
                Id = request.Id ?? Guid.NewGuid(),
                Name = request.Name,
                TenantId = request.TenantId,
                IsSuperRole = request.IsSuperRole,
                CreatedBy = _userInfoToken.Id, // or null if seeding
                CreatedDate = DateTime.UtcNow,
                ModifiedBy = _userInfoToken.Id,
                ModifiedDate = DateTime.UtcNow,
                // NormalizedName is handled by CreateAsync usually, but we can set it
            };

            var result = await _roleManager.CreateAsync(entity);
            if (!result.Succeeded)
            {
                return ServiceResponse<RoleDto>.Return500(string.Join(", ", result.Errors.Select(e => e.Description)));
            }

            // Handle Claims
            // Note: RoleManager.AddClaimAsync does one by one.
            foreach(var claim in request.RoleClaims)
            {
                await _roleManager.AddClaimAsync(entity, new System.Security.Claims.Claim(claim.ClaimType, claim.ClaimValue));
            }

            var entityDto = _mapper.Map<RoleDto>(entity);
            return ServiceResponse<RoleDto>.ReturnResultWith200(entityDto);
        }
    }
}
