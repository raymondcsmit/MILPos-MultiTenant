using System;
using System.Collections.Generic;

namespace POS.Data.Entities
{
    public class Variant : BaseEntity
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public List<VariantItem> VariantItems { get; set; }
      
    }
}
