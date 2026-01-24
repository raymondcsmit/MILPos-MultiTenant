using System;

namespace POS.Data.Resources
{
    public class PendingSalesOrderResource : ResourceParameter
    {
        public PendingSalesOrderResource() : base("")
        {

        }
        public Guid? CustomerId { get; set; }
        public string OrderNumber { get; set; }
        public string CustomerName { get; set; }
        public DateTime? SOCreatedDate { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public PaymentStatus? PaymentStatus { get; set; }
    }
}
