using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
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
    public class GetAllMenuItemsQueryHandler : IRequestHandler<GetAllMenuItemsQuery, ServiceResponse<List<MenuItemDto>>>
    {
        private readonly IMenuItemRepository _menuItemRepository;
        private readonly IMapper _mapper;

        public GetAllMenuItemsQueryHandler(
            IMenuItemRepository menuItemRepository,
            IMapper mapper)
        {
            _menuItemRepository = menuItemRepository;
            _mapper = mapper;
        }

        public async Task<ServiceResponse<List<MenuItemDto>>> Handle(GetAllMenuItemsQuery request, CancellationToken cancellationToken)
        {
            var menuItems = await _menuItemRepository.All
                .OrderBy(c => c.Order)
                .ToListAsync();

            var dtos = _mapper.Map<List<MenuItemDto>>(menuItems);
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
