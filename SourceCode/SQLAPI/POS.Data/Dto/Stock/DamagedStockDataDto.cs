using System;

namespace POS.Data.Dto
{
    public class DamagedStockDataDto
    {
        public Guid Id { get; set; }
        public string ProductName { get; set; }
        public decimal DamagedQuantity { get; set; }
        public string Reason { get; set; }
        public string ReportedBy { get; set; }
        public DateTime DamagedDate { get; set; }
        public string Location { get; set; }
    }
}
