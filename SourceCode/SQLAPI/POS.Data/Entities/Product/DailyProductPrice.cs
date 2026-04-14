using POS.Data.Entities;
using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data
{
    public class DailyProductPrice : BaseEntity
    {
        public Guid Id { get; set; }
        public Guid ProductId { get; set; }
        [ForeignKey("ProductId")]
        public Product Product { get; set; }

        public DateTime PriceDate { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal SalesPrice { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? Mrp { get; set; }

        public bool IsActive { get; set; } = true;

    }
}
