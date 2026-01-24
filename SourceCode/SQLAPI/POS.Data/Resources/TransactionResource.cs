using System;
using POS.Data.Entities.Accounts;

namespace POS.Data.Resources
{
    public class TransactionResource : ResourceParameter
    {
        public TransactionResource() : base("transactionDate")
        {

        }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }


        public string TransactionNumber { get; set; }
        public string ReferenceNumber { get; set; }
        public Guid? BranchId { get; set; }
        public TransactionType? TransactionType { get; set; }
        public TransactionStatus? Status { get; set; }
        public ACCPaymentStatus? PaymentStatus { get; set; }
    }
}
