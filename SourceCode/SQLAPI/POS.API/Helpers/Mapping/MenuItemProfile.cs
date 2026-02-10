using AutoMapper;
using POS.Data;
using POS.Data.Dto;

using POS.MediatR.MenuItem.Commands;

namespace POS.API.Helpers.Mapping
{
    public class MenuItemProfile : Profile
    {
        public MenuItemProfile()
        {
            CreateMap<MenuItem, MenuItemDto>().ReverseMap();
            CreateMap<CreateMenuItemCommand, MenuItem>();
            CreateMap<UpdateMenuItemCommand, MenuItem>();
        }
    }
}
