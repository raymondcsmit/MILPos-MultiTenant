using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data
{
    public class RoleMenuItem
    {
        public Guid Id { get; set; }
        public Guid RoleId { get; set; }
        public Guid MenuItemId { get; set; }
        public bool CanView { get; set; }
        public bool CanCreate { get; set; }
        public bool CanEdit { get; set; }
        public bool CanDelete { get; set; }
        public DateTime AssignedDate { get; set; }
        public Guid AssignedBy { get; set; }

        [ForeignKey("RoleId")]
        public Role Role { get; set; }

        [ForeignKey("MenuItemId")]
        public MenuItem MenuItem { get; set; }

        [ForeignKey("AssignedBy")]
        public User AssignedByUser { get; set; }
    }
}
