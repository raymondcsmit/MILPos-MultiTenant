using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Data.Dto.Acconting
{
    public class TaxReportDto
    {
        public Decimal InputGstTotal { get; set; }
        public Decimal InputGstReturnTotal { get; set; }
        public Decimal OutputGstTotal { get; set; }
        public Decimal OutputGstReturnTotal { get; set; }
        public Decimal NetTaxPayable { get; set; }
        public string Status { get; set; } // e.g. "Payable", "Refundable ITC", "Balanced"
        public List<ChildTaxDto> InputTaxes { get; set; }
        public List<ChildTaxDto> OutputTaxes{ get; set; }
    }

    public class ChildTaxDto
    {
        public string TaxName { get; set; }
        public decimal Amount { get; set; }
    }
}
