using MediatR;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities.Accounts;
using POS.Helper;
using System;
using System.Collections.Generic;

namespace POS.MediatR.CommandAndQuery
{
    public class AddSalesOrderCommand : IRequest<ServiceResponse<SalesOrderDto>>
    {
        public string OrderNumber { get; set; }
        public string Note { get; set; }
        public string TermAndCondition { get; set; }
        public bool IsSalesOrderRequest { get; set; }
        public DateTime SOCreatedDate { get; set; }
        public SalesOrderStatus Status { get; set; }
        public DateTime DeliveryDate { get; set; }
        public SalesDeliveryStatus DeliveryStatus { get; set; }
        public Guid CustomerId { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal TotalTax { get; set; }
        public decimal TotalDiscount { get; set; }
        public decimal TotalRoundOff { get; set; }
        public decimal FlatDiscount { get; set; }
        public List<SalesOrderItemDto> SalesOrderItems { get; set; }
        public Guid LocationId { get; set; }
        public bool IsAllowPayment { get; set; }
        public bool IsPOSScreenOrder { get; set; }
        public string ReferenceNumber { get; set; }
        public ACCPaymentMethod PaymentMethod { get; set; }
        
        // FBR Fields
        public string BuyerNTN { get; set; }
        public string BuyerCNIC { get; set; }
        public string BuyerName { get; set; }
        public string BuyerPhoneNumber { get; set; }
        public string BuyerAddress { get; set; }
        public string SaleType { get; set; }

    }
}
