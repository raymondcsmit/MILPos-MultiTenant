using POS.Helper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Data.Resources
{
    public class ProductStockAlertResource : ResourceParameters
    {
        public ProductStockAlertResource() : base("Stock")
        {

        }
        public string ProductName { get; set; }
        public Guid? LocationId { get; set; }
    }
}
