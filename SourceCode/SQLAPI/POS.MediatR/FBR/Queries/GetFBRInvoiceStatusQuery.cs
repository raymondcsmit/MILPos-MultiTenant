using MediatR;
using POS.Helper;
using System;

namespace POS.MediatR.FBR.Queries
{
    public class GetFBRInvoiceStatusQuery : IRequest<ServiceResponse<object>>
    {
        public Guid SalesOrderId { get; set; }
    }
}
