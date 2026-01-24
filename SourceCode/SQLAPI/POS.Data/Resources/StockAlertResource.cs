using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using POS.Helper;

namespace POS.Data
{
    public class StockAlertResource : ResourceParameters
    {
        public StockAlertResource() : base("Stock")
        {

        }
        public string ProductName { get; set; }
        public Guid? LocationId { get; set; }
    }
}