using POS.Data.Entities;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data
{
    public class PurchaseOrder : BaseEntity
    {
        public Guid Id { get; set; }
        public string OrderNumber { get; set; }
        public string Note { get; set; }
        public string PurchaseReturnNote { get; set; }
        public string TermAndCondition { get; set; }
        public bool IsPurchaseOrderRequest { get; set; }
        public DateTime POCreatedDate { get; set; }
        public PurchaseOrderStatus Status { get; set; } = PurchaseOrderStatus.Not_Return;
        public DateTime DeliveryDate { get; set; }
        public PurchaseDeliveryStatus DeliveryStatus { get; set; }
        public Guid SupplierId { get; set; }
        public Supplier Supplier { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmount { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalTax { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalDiscount { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalPaidAmount { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalRoundOff { get; set; } = 0;
        public decimal TotalRefundAmount { get; set; } = 0;
        public PaymentStatus PaymentStatus { get; set; }
        public Guid LocationId { get; set; }
        [ForeignKey("LocationId")]
        public Location Location { get; set; }
        public List<PurchaseOrderItem> PurchaseOrderItems { get; set; }
        public List<PurchaseOrderPayment> PurchaseOrderPayments { get; set; }
    }
}
