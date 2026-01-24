using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data.Entities
{
    public class VariantItem: BaseEntity
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public Guid VariantId { get; set; }
        [ForeignKey("VariantId")]
        public Variant Variant { get; set; }
    }
}
