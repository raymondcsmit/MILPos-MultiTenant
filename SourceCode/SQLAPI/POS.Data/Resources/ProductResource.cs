using POS.Data.Enums;
using POS.Data.Resources;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Data.Resources
{
    public class ProductResource : ResourceParameters
    {
        public ProductResource() : base("CreatedDate")
        {
        }

        public string Name { get; set; }
        public string Barcode { get; set; }
        public Guid? UnitId { get; set; }
        public Guid? CategoryId { get; set; }
        public Guid? BrandId { get; set; }
        public ProductType? ProductType { get; set; }
        public Guid? ParentId { get; set; }
        public Guid? LocationId { get; set; }
        public bool IsBarcodeGenerated { get; set; }
        public bool IgnoreTenantFilter { get; set; }
    }
}
