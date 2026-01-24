using POS.Data.Entities.Accounts;
using System;

namespace POS.Data.Resources
{
    public class GeneralEntryResource : ResourceParameter
    {
        public GeneralEntryResource() : base("createdDate")
        {

        }
        public string TransactionNumber { get; set; }
        public Guid? BranchId { get; set; }
        public Guid? FinancialYearId { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public TransactionType? TransactionType { get; set; }
    }
}
