using MediatR;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities.Accounts;
using POS.Helper;
using System;
using System.Collections.Generic;

namespace POS.MediatR.SalesOrder.Commands
{
    public class UpdateSalesOrderReturnCommand : IRequest<ServiceResponse<bool>>
    {
        public Guid LocationId { get; set; }
        public Guid Id { get; set; }
        public string OrderNumber { get; set; }
        public string Note { get; set; }
        public string TermAndCondition { get; set; }
        public bool IsSalesOrderRequest { get; set; }
        //public DateTime SOCreatedDate { get; set; }
        public SalesOrderStatus Status { get; set; }
        public DateTime DeliveryDate { get; set; }
        public SalesDeliveryStatus DeliveryStatus { get; set; }
        public Guid CustomerId { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal TotalTax { get; set; }
        public decimal TotalDiscount { get; set; }
        public decimal FlatDiscount { get; set; }
        public decimal TotalRoundOff { get; set; } = 0;
        public ACCPaymentMethod PaymentMethod { get; set; }
        public bool IsSelectPaymentMethod { get; set; } = false;
        public List<SalesOrderItemDto> SalesOrderItems { get; set; }
    }
}
