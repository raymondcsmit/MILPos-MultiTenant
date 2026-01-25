using System;
using System.Collections.Generic;



namespace POS.Data.Dto
{
    public class SalesOrderDto
    {
        public Guid Id { get; set; }
        public string OrderNumber { get; set; }
        public string Note { get; set; }
        public string TermAndCondition { get; set; }
        public bool IsSalesOrderRequest { get; set; }
        public DateTime SOCreatedDate { get; set; }
        public SalesOrderStatus Status { get; set; }
        public DateTime DeliveryDate { get; set; }
        public SalesDeliveryStatus DeliveryStatus { get; set; }
        public Guid CustomerId { get; set; }
        public string CustomerName { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal TotalTax { get; set; }
        public decimal TotalDiscount { get; set; }
        public decimal FlatDiscount { get; set; }
        public decimal TotalPaidAmount { get; set; }
        public decimal TotalRefundAmount { get; set; }
        public PaymentStatus PaymentStatus { get; set; }
        public List<SalesOrderItemDto> SalesOrderItems { get; set; }
        public List<SalesOrderPaymentDto> SalesOrderPayments { get; set; }
        public CustomerDto Customer { get; set; }
        public Guid LocationId { get; set; }
        public LocationDto Location { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public string CreatedByName { get; set; }
        public string BusinessLocation { get; set; }
        public decimal ReturnItemCount { get; set; } = 0;
        public decimal ReturnItemPrice { get; set; } = 0;
        public decimal TotalItemQuantities { get; set; } = 0;
        
        // FBR Fields
        public string BuyerNTN { get; set; }
        public string BuyerCNIC { get; set; }
        public string BuyerName { get; set; }
        public string BuyerPhoneNumber { get; set; }
        public string BuyerAddress { get; set; }
        public string SaleType { get; set; }
        public string FBRStatus { get; set; }
        public string FBRInvoiceNumber { get; set; }
        public string FBRUSIN { get; set; }
        public string FBRQRCodeImagePath { get; set; }
        public string FBRErrorMessage { get; set; }
    }
}
