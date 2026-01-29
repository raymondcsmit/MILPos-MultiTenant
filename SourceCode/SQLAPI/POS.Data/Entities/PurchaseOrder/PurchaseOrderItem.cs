using POS.Data.Entities;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data
{
    public class PurchaseOrderItem
    {
        public Guid Id { get; set; }
        public Guid ProductId { get; set; }
        public PurchaseSaleItemStatusEnum Status { get; set; } = PurchaseSaleItemStatusEnum.Not_Return;
        public Guid PurchaseOrderId { get; set; }
        [ForeignKey("PurchaseOrderId")]
        public PurchaseOrder PurchaseOrder { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal UnitPrice { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal Quantity { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal TaxValue { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal Discount { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal DiscountPercentage { get; set; }
        public string DiscountType { get; set; }
        public Guid UnitId { get; set; }
        [ForeignKey("UnitId")]
        public UnitConversation UnitConversation { get; set; }
        [ForeignKey("ProductId")]
        public Product Product { get; set; }
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
        public List<PurchaseOrderItemTax> PurchaseOrderItemTaxes { get; set; }
        
        // Batch Tracking Fields
        public string BatchNumber { get; set; }
        public DateTime? ExpiryDate { get; set; }

    }
}
