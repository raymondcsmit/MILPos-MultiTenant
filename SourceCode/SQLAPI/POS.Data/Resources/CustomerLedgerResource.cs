using System;

namespace POS.Data.Resources
{
    public class CustomerLedgerResource : ResourceParameter
    {
        public CustomerLedgerResource() : base("accountDate")
        {

        }
        public DateTime? Date { get; set; }
        public Guid? AccountId { get; set; }
        public Guid? CustomerId { get; set; }
        public string Reference { get; set; }
        public Guid? LocationId { get; set; }
    }
}
