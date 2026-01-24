using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Data.Dto
{
    public class ProductStockAlertDto
    {
        public Guid ProductId { get; set; }
        public string ProductName { get; set; }
        public string BusinessLocation { get; set; }
        public decimal Stock { get; set; }
        public string Unit { get; set; }
    }
}
