using POS.Data.Enums;
using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data
{
    public class MenuItemAction
    {
        public Guid MenuItemId { get; set; }
        public Guid ActionId { get; set; }
        public MenuOperationType Operation { get; set; }

        [ForeignKey("MenuItemId")]
        public MenuItem MenuItem { get; set; }

        [ForeignKey("ActionId")]
        public Action Action { get; set; }
    }
}
