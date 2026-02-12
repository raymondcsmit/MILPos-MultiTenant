using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data;
using POS.Data.Dto;
using POS.Helper;
using POS.MediatR.MenuItem.Queries;
using POS.Repository;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.MenuItem.Handlers
{
    public class GetMenuItemsForUserQueryHandler : IRequestHandler<GetMenuItemsForUserQuery, ServiceResponse<List<MenuItemDto>>>
    {
        private readonly IMenuItemRepository _menuItemRepository;
        private readonly IUserRoleRepository _userRoleRepository;
        private readonly IMapper _mapper;

        public GetMenuItemsForUserQueryHandler(
            IMenuItemRepository menuItemRepository,
            IUserRoleRepository userRoleRepository,
            IMapper mapper)
        {
            _menuItemRepository = menuItemRepository;
            _userRoleRepository = userRoleRepository;
            _mapper = mapper;
        }

        public async Task<ServiceResponse<List<MenuItemDto>>> Handle(GetMenuItemsForUserQuery request, CancellationToken cancellationToken)
        {
            var userRoles = await _userRoleRepository.FindBy(ur => ur.UserId == request.UserId).ToListAsync();
            var roleIds = userRoles.Select(ur => ur.RoleId).ToList();

            // var menuItems = await _menuItemRepository.GetMenuItemsByRolesAsync(roleIds);
            var allMenuItems = await _menuItemRepository.AllIncluding(c => c.RoleMenuItems)
                .Where(c => c.IsActive)
                 .OrderBy(c => c.Order)
                .ToListAsync();

            // Deduplicate menu items locally
            var menuItems = allMenuItems
                .GroupBy(m => m.Id)
                .Select(g =>
                {
                    var item = g.First();
                    if (item.RoleMenuItems != null)
                    {
                        item.RoleMenuItems = g.SelectMany(x => x.RoleMenuItems ?? Enumerable.Empty<RoleMenuItem>())
                                              .GroupBy(rm => rm.Id)
                                              .Select(grp => grp.First())
                                              .ToList();
                    }
                    return item;
                })
                .ToList();

            var dtos = _mapper.Map<List<MenuItemDto>>(menuItems);

            foreach (var dto in dtos)
            {
                var entity = menuItems.FirstOrDefault(m => m.Id == dto.Id);
                if (entity != null && entity.RoleMenuItems != null)
                {
                    var permissions = entity.RoleMenuItems
                        .Where(rm => roleIds.Contains(rm.RoleId))
                        .ToList();

                    dto.CanView = permissions.Any(p => p.CanView);
                    dto.CanCreate = permissions.Any(p => p.CanCreate);
                    dto.CanEdit = permissions.Any(p => p.CanEdit);
                    dto.CanDelete = permissions.Any(p => p.CanDelete);
                }
            }

            var tree = BuildTree(dtos);
            return ServiceResponse<List<MenuItemDto>>.ReturnResultWith200(tree);
        }

        private List<MenuItemDto> BuildTree(List<MenuItemDto> items)
        {
            var dict = items.ToDictionary(i => i.Id);
            var rootItems = new List<MenuItemDto>();

            foreach (var item in items)
            {
                if (item.ParentId.HasValue && dict.ContainsKey(item.ParentId.Value))
                {
                    dict[item.ParentId.Value].Children.Add(item);
                }
                else
                {
                    rootItems.Add(item);
                }
            }
            return rootItems;
        }
    }
}
