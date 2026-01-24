using MediatR;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities.Accounts;
using POS.Helper;
using System;

namespace POS.MediatR.PurchaseOrderPayment.Command
{
    public class AddPurchaseOrderPaymentCommand : IRequest<ServiceResponse<PurchaseOrderPaymentDto>>
    {
        public Guid PurchaseOrderId { get; set; }
        public DateTime PaymentDate { get; set; }
        public string ReferenceNumber { get; set; }
        public decimal Amount { get; set; }
        public ACCPaymentMethod PaymentMethod { get; set; }
        public string Note { get; set; }
        public string AttachmentUrl { get; set; }
        public string AttachmentData { get; set; }
    }
}
