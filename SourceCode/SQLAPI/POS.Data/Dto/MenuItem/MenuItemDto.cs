using System;
using System.Collections.Generic;

namespace POS.Data.Dto
{
    public class MenuItemDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; }
        public string Path { get; set; }
        public string Icon { get; set; }
        public string CssClass { get; set; }
        public int Order { get; set; }
        public Guid? ParentId { get; set; }
        public bool IsActive { get; set; }
        public bool IsVisible { get; set; }
        public List<MenuItemDto> Children { get; set; } = new List<MenuItemDto>();

        // Permissions (populated for user-specific queries)
        public bool CanView { get; set; }
        public bool CanCreate { get; set; }
        public bool CanEdit { get; set; }
        public bool CanDelete { get; set; }
    }
}
