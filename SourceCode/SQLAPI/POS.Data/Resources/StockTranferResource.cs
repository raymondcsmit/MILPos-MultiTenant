using System;

namespace POS.Data.Resources
{
    public class StockTranferResource : ResourceParameter
    {
        public StockTranferResource() : base("TransferDate")
        {
        }
        public string ReferenceNo { get; set; }
        public Guid? ToLocationId { get; set; }
        public Guid? FromLocationId { get; set; }
    }
}