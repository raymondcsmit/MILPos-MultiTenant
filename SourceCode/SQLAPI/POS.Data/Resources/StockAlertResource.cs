using System;
using POS.Data.Resources;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

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