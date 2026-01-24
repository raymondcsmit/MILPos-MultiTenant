using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Data.Dto
{
    public class PurchaseOrderItemTaxDto
    {
        public Guid? Id { get; set; }
        public Guid? PurchaseOrderItemId { get; set; }
        public Guid TaxId { get; set; }
        public decimal TaxValue { get; set; }
        public string TaxName { get; set; }
        public decimal TaxPercentage { get; set; }
    }
}
