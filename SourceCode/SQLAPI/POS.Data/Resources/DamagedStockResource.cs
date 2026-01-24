using System;

namespace POS.Data.Resources
{
    public class DamagedStockResource : ResourceParameter
    {
        public DamagedStockResource() : base("damagedDate")
        {
        }
        public DateTime? DamagedDate { get; set; }
        public string ProductId { get; set; }
        public Guid? LocationId { get; set; }

    }
}

