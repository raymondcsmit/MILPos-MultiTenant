using System;

namespace POS.Data.Dto
{
    public class DamagedStockDto
    {
        public Guid Id { get; set; }
        public Guid ProductId { get; set; }
        public Product Product { get; set; }
        public int DamagedQuantity { get; set; }
        public string Reason { get; set; }
        public Guid ReportedId { get; set; }
        public UserDto ReportedBy { get; set; }
        public DateTime DamagedDate { get; set; }
        public DateTime CreatedDate { get; set; }
        public Guid CreatedBy { get; set; }
        public UserDto CreatedByUser { get; set; }
        public Guid LocationId { get; set; }
        public LocationDto Location { get; set; }
    }
}
