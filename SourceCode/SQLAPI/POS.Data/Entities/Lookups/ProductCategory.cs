using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data.Entities
{
    public class ProductCategory : BaseEntity
    {
        public string Name { get; set; }
        public Guid? ParentId { get; set; }
        public string Description { get; set; }
        [ForeignKey("ParentId")]
        public ProductCategory ParentCategory { get; set; }

    }
}
