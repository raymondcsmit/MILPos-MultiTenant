using MediatR;
using POS.Data.Dto;
using POS.Helper;
using System;

namespace POS.MediatR.MenuItem.Commands
{
    public class CreateMenuItemCommand : IRequest<ServiceResponse<MenuItemDto>>
    {
        public string Title { get; set; }
        public string Path { get; set; }
        public string Icon { get; set; }
        public string CssClass { get; set; }
        public int Order { get; set; }
        public Guid? ParentId { get; set; }
        public bool IsActive { get; set; }
        public bool IsVisible { get; set; }
    }

    
}
