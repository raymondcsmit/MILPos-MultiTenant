using System;

namespace POS.Data.Dto
{
    public class DailyProductPriceDto
    {
        public Guid Id { get; set; }
        public Guid ProductId { get; set; }
        public string ProductName { get; set; }
        public string ProductCode { get; set; }
        public string CategoryName { get; set; }
        public string BrandName { get; set; }
        public DateTime PriceDate { get; set; }
        public decimal SalesPrice { get; set; }
        public decimal? Mrp { get; set; }
        public decimal? BaseSalesPrice { get; set; }
        public decimal? PreviousDayPrice { get; set; }
        public bool IsActive { get; set; }
        public string Status { get; set; } // "Updated", "Pending", "Unchanged"
        public string ImagePath { get; set; }
        public string UnitName { get; set; }
    }
}
