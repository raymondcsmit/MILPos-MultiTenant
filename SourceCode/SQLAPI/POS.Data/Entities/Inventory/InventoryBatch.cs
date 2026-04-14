using POS.Data.Entities;
using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data.Entities.Inventory
{
    public class InventoryBatch : BaseEntity
    {
        public string BatchNumber { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public DateTime? ManufacturingDate { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal Quantity { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal PurchasePrice { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal SalesPrice { get; set; }

        public Guid ProductId { get; set; }
        [ForeignKey("ProductId")]
        public Product Product { get; set; }

        public Guid LocationId { get; set; }
        [ForeignKey("LocationId")]
        public Location Location { get; set; }
        
        public bool IsActive { get; set; } = true;
    }
}
