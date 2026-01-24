using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Data.Dto.PurchaseOrder
{
    public class PurchaseSalesTotalDto
    {
        public decimal GrandTotalAmount { get; set; }
        public decimal GrandTotalTaxAmount { get; set; }
    }
}
