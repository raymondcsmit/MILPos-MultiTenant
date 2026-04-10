using MediatR;
using POS.Helper;
using POS.Domain.FBR.DTOs;
using System;

namespace POS.MediatR.FBR.Commands
{
    public class SubmitFBRInvoiceCommand : IRequest<ServiceResponse<FBRInvoiceResponse>>
    {
        public Guid SalesOrderId { get; set; }
    }
}
