using System;
using System.Collections.Generic;

namespace POS.Data.Dto
{
    public class PurchaseOrderDto
    {
        public Guid Id { get; set; }
        public string OrderNumber { get; set; }
        public string Note { get; set; }
        public string TermAndCondition { get; set; }
        public bool IsPurchaseOrderRequest { get; set; }
        public DateTime POCreatedDate { get; set; }
        public PurchaseOrderStatus Status { get; set; }
        public DateTime DeliveryDate { get; set; }
        public PurchaseDeliveryStatus DeliveryStatus { get; set; }
        public Guid SupplierId { get; set; }
        public string SupplierName { get; set; }
        
        public Guid? SalesPersonId { get; set; }
        public string SalesPersonName { get; set; }
        
        public decimal TotalAmount { get; set; }
        public decimal TotalTax { get; set; }
        public decimal TotalDiscount { get; set; }
        public decimal TotalPaidAmount { get; set; }
        public decimal TotalRefundAmount { get; set; }
        public PaymentStatus PaymentStatus { get; set; }
        public Guid LocationId { get; set; }
        public string BusinessLocation { get; set; }
        public string SupplierTaxNumber { get; set; }
        public string CreatedByName { get; set; }
        public DateTime ModifiedDate { get; set; }
        public List<PurchaseOrderItemDto> PurchaseOrderItems { get; set; }
        public List<PurchaseOrderPaymentDto> PurchaseOrderPayments { get; set; }
        public SupplierDto Supplier { get; set; }
        public LocationDto Location { get; set; }
        public decimal ReturnItemCount { get; set; } = 0;
        public decimal ReturnItemPrice { get; set; } = 0;
        public decimal TotalItemQuantities { get; set; } = 0;
    }
}
