using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Domain;
using POS.Helper;
using POS.MediatR.MenuItem.Commands;
using POS.Repository;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.MenuItem.Handlers
{
    public class UpdateMenuItemCommandHandler : IRequestHandler<UpdateMenuItemCommand, ServiceResponse<MenuItemDto>>
    {
        private readonly IMenuItemRepository _menuItemRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly IMapper _mapper;
        private readonly ILogger<UpdateMenuItemCommandHandler> _logger;
        private readonly ITenantProvider _tenantProvider;
        private readonly IUserRoleRepository _userRoleRepository;
        private readonly IRoleRepository _roleRepository;
        private readonly UserInfoToken _userInfoToken;

        public UpdateMenuItemCommandHandler(
            IMenuItemRepository menuItemRepository,
            IUnitOfWork<POSDbContext> uow,
            IMapper mapper,
            ILogger<UpdateMenuItemCommandHandler> logger,
            ITenantProvider tenantProvider,
            IUserRoleRepository userRoleRepository,
            IRoleRepository roleRepository,
            UserInfoToken userInfoToken)
        {
            _menuItemRepository = menuItemRepository;
            _uow = uow;
            _mapper = mapper;
            _logger = logger;
            _tenantProvider = tenantProvider;
            _userRoleRepository = userRoleRepository;
            _roleRepository = roleRepository;
            _userInfoToken = userInfoToken;
        }

        public async Task<ServiceResponse<MenuItemDto>> Handle(UpdateMenuItemCommand request, CancellationToken cancellationToken)
        {
            var entity = await _menuItemRepository.FindBy(m => m.Id == request.Id).FirstOrDefaultAsync();
            if (entity == null)
            {
                _logger.LogError("MenuItem does not exist.");
                return ServiceResponse<MenuItemDto>.Return404();
            }

            var userRoles = await _userRoleRepository.FindBy(ur => ur.UserId == _userInfoToken.Id).ToListAsync();
            var roleIds = userRoles.Select(ur => ur.RoleId).ToList();
            var roles = await _roleRepository.FindBy(r => roleIds.Contains(r.Id)).ToListAsync();
            bool isSuperAdmin = roles.Any(r => r.Name == AppConstants.Roles.SuperAdmin);

            if (!isSuperAdmin)
            {
                // Tenant Admin cannot edit Global Items
                if (entity.TenantId == null)
                {
                    return ServiceResponse<MenuItemDto>.ReturnFailed(403, "You do not have permission to edit Global Menu Items.");
                }
                
                // Tenant Admin cannot change TenantId (it must remain their own)
                if (request.TenantId.HasValue && request.TenantId != entity.TenantId)
                {
                     // Force match
                     request.TenantId = entity.TenantId;
                }
            }

            _mapper.Map(request, entity);

            if (!isSuperAdmin)
            {
                // Re-enforce TenantId just in case mapper or request tried to change it
                 entity.TenantId = _tenantProvider.GetTenantId();
            }

            _menuItemRepository.Update(entity);
            
            if (await _uow.SaveAsync() <= 0)
            {
                return ServiceResponse<MenuItemDto>.Return500();
            }

            return ServiceResponse<MenuItemDto>.ReturnResultWith200(_mapper.Map<MenuItemDto>(entity));
        }
    }
}
