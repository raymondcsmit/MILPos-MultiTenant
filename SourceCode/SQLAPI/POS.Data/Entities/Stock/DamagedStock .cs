using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data.Entities
{
    public class DamagedStock : BaseEntity
    {
        public Guid ProductId { get; set; }
        [ForeignKey("ProductId")]
        public Product Product { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal DamagedQuantity { get; set; }
        public string Reason { get; set; }
        public Guid ReportedId { get; set; }
        [ForeignKey("ReportedId")]
        public User ReportedBy { get; set; }
        public DateTime DamagedDate { get; set; }
        public Guid LocationId { get; set; }
        [ForeignKey("LocationId")]
        public Location Location { get; set; }
    }
}
