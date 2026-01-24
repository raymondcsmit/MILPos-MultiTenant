using System;

namespace POS.Data.Resources
{
    public class DailyStockResource : ResourceParameter
    {
        public DailyStockResource() : base("dailyStockDate")
        {
        }
        public DateTime? DailyStockDate { get; set; }
        public Guid? ProductId { get; set; }
        public Guid? LocationId { get; set; }

    }
}
