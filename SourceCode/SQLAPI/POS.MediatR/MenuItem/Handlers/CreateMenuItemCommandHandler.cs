using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Common;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Domain;
using POS.Helper;
using POS.MediatR.MenuItem.Commands;
using POS.Repository;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.MenuItem.Handlers
{
    public class CreateMenuItemCommandHandler : IRequestHandler<CreateMenuItemCommand, ServiceResponse<MenuItemDto>>
    {
        private readonly IMenuItemRepository _menuItemRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly IMapper _mapper;
        private readonly ITenantProvider _tenantProvider;
        private readonly IUserRoleRepository _userRoleRepository;
        private readonly IRoleRepository _roleRepository;
        private readonly UserInfoToken _userInfoToken;

        public CreateMenuItemCommandHandler(
            IMenuItemRepository menuItemRepository,
            IUnitOfWork<POSDbContext> uow,
            IMapper mapper,
            ITenantProvider tenantProvider,
            IUserRoleRepository userRoleRepository,
            IRoleRepository roleRepository,
            UserInfoToken userInfoToken)
        {
            _menuItemRepository = menuItemRepository;
            _uow = uow;
            _mapper = mapper;
            _tenantProvider = tenantProvider;
            _userRoleRepository = userRoleRepository;
            _roleRepository = roleRepository;
            _userInfoToken = userInfoToken;
        }

        public async Task<ServiceResponse<MenuItemDto>> Handle(CreateMenuItemCommand request, CancellationToken cancellationToken)
        {
            var userRoles = await _userRoleRepository.FindBy(ur => ur.UserId == _userInfoToken.Id).ToListAsync();
            var roleIds = userRoles.Select(ur => ur.RoleId).ToList();
            var roles = await _roleRepository.FindBy(r => roleIds.Contains(r.Id)).ToListAsync();
            bool isSuperAdmin = roles.Any(r => r.Name == AppConstants.Roles.SuperAdmin);

            var entity = _mapper.Map<POS.Data.MenuItem>(request);
            entity.Id = Guid.NewGuid();

            if (!isSuperAdmin)
            {
                // Force tenant if not Super Admin
                entity.TenantId = _tenantProvider.GetTenantId();
            }

            _menuItemRepository.Add(entity);
            await _uow.SaveAsync();

            return ServiceResponse<MenuItemDto>.ReturnResultWith200(_mapper.Map<MenuItemDto>(entity));
        }
    }
}
