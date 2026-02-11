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
    public class DeleteMenuItemCommandHandler : IRequestHandler<DeleteMenuItemCommand, ServiceResponse<bool>>
    {
        private readonly IMenuItemRepository _menuItemRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly ILogger<DeleteMenuItemCommandHandler> _logger;
        private readonly ITenantProvider _tenantProvider;
        private readonly IUserRoleRepository _userRoleRepository;
        private readonly IRoleRepository _roleRepository;
        private readonly UserInfoToken _userInfoToken;

        public DeleteMenuItemCommandHandler(
            IMenuItemRepository menuItemRepository,
            IUnitOfWork<POSDbContext> uow,
            ILogger<DeleteMenuItemCommandHandler> logger,
            ITenantProvider tenantProvider,
            IUserRoleRepository userRoleRepository,
            IRoleRepository roleRepository,
            UserInfoToken userInfoToken)
        {
            _menuItemRepository = menuItemRepository;
            _uow = uow;
            _logger = logger;
            _tenantProvider = tenantProvider;
            _userRoleRepository = userRoleRepository;
            _roleRepository = roleRepository;
            _userInfoToken = userInfoToken;
        }

        public async Task<ServiceResponse<bool>> Handle(DeleteMenuItemCommand request, CancellationToken cancellationToken)
        {
            var entity = await _menuItemRepository.FindBy(m => m.Id == request.Id).FirstOrDefaultAsync();
            if (entity == null)
            {
                _logger.LogError("MenuItem does not exist.");
                return ServiceResponse<bool>.Return404();
            }

            var userRoles = await _userRoleRepository.FindBy(ur => ur.UserId == _userInfoToken.Id).ToListAsync();
            var roleIds = userRoles.Select(ur => ur.RoleId).ToList();
            var roles = await _roleRepository.FindBy(r => roleIds.Contains(r.Id)).ToListAsync();
            bool isSuperAdmin = roles.Any(r => r.Name == AppConstants.Roles.SuperAdmin);

            if (!isSuperAdmin)
            {
                // Tenant Admin cannot delete Global Items
                if (entity.TenantId == null)
                {
                    return ServiceResponse<bool>.ReturnFailed(403, "You do not have permission to delete Global Menu Items.");
                }
            }

            // Check if it has children
            var childrenQuery = _menuItemRepository.FindBy(m => m.ParentId == request.Id && !m.IsDeleted);
            // Must account for query filters. Global children might exist?
            // If deleting a Tenant item, it should not have Global children (logic prevents this hopefully).
            // But if deleting a Global item (Super Admin), it might have Global children.
            
            var hasChildren = await childrenQuery.AnyAsync();
            if (hasChildren)
            {
                // return ServiceResponse<bool>.Return409("Cannot delete menu item with children.");
                return ServiceResponse<bool>.ReturnFailed(409, "Cannot delete menu item with children.");
            }

            entity.IsDeleted = true;
            entity.DeletedDate = System.DateTime.UtcNow;
            entity.DeletedBy = _userInfoToken.Id; // optional if available
            
            _menuItemRepository.Update(entity);

            if (await _uow.SaveAsync() <= 0)
            {
                return ServiceResponse<bool>.Return500();
            }

            return ServiceResponse<bool>.ReturnResultWith200(true);
        }
    }
}
