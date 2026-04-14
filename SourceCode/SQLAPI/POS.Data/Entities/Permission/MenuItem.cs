using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data
{
    public class MenuItem : SharedBaseEntity
    {
        public string Title { get; set; }
        public string Path { get; set; }
        public string Icon { get; set; }
        public string CssClass { get; set; }
        public int Order { get; set; }
        public Guid? ParentId { get; set; }
        public bool IsActive { get; set; }
        public bool IsVisible { get; set; }
        public Guid? TenantId { get; set; }

        [ForeignKey("ParentId")]
        public MenuItem Parent { get; set; }
        public virtual ICollection<MenuItem> Children { get; set; }
        public virtual ICollection<MenuItemAction> MenuItemActions { get; set; }
        public virtual ICollection<RoleMenuItem> RoleMenuItems { get; set; }
    }
}
