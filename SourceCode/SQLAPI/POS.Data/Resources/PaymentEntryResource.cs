using POS.Data.Entities.Accounts;
using POS.Helper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Data.Resources
{
    public class PaymentEntryResource:ResourceParameters
    {
        public PaymentEntryResource():base("PaymentDate")
        {
            
        }
        public string TransactionNumber { get; set; }
        public Guid? BranchId { get; set; }
        public Guid? FinancialYearId { get; set; }
        public DateTime? PaymentFromDate { get; set; }
        public DateTime? PaymentToDate { get; set; }
        public decimal? Amount { get; set; }
    }
}
