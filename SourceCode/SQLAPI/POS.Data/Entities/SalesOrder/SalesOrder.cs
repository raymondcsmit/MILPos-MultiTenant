using POS.Data.Entities;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data
{
    public class SalesOrder : BaseEntity
    {
        public Guid Id { get; set; }
        public string OrderNumber { get; set; }
        public string Note { get; set; }
        public string SaleReturnNote { get; set; }
        public string TermAndCondition { get; set; }
        public bool IsSalesOrderRequest { get; set; }
        public DateTime SOCreatedDate { get; set; }
        public SalesOrderStatus Status { get; set; } = SalesOrderStatus.Not_Return;
        public DateTime DeliveryDate { get; set; }
        public SalesDeliveryStatus DeliveryStatus { get; set; }
        public Guid CustomerId { get; set; }
        public Customer Customer { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmount { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalTax { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalDiscount { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal FlatDiscount { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalPaidAmount { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalRoundOff { get; set; } = 0;
        public decimal TotalRefundAmount { get; set; } = 0;
        public PaymentStatus PaymentStatus { get; set; }
        public Guid LocationId { get; set; }
        [ForeignKey("LocationId")]
        public Location Location { get; set; }
        public List<SalesOrderItem> SalesOrderItems { get; set; }
        public List<SalesOrderPayment> SalesOrderPayments { get; set; }

    }
}
