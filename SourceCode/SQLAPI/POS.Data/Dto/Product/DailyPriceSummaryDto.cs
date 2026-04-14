using System;

namespace POS.Data.Dto
{
    public class DailyPriceSummaryDto
    {
        public int TotalProducts { get; set; }
        public int UpdatedCount { get; set; }
        public int PendingCount { get; set; }
        public int UnchangedCount { get; set; }
        public decimal TotalVariance { get; set; }
        public decimal MaxPriceIncrease { get; set; }
        public decimal MaxPriceDecrease { get; set; }
    }
}
