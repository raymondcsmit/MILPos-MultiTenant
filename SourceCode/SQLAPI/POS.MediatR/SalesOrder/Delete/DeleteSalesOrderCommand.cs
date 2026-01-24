using System;
using MediatR;
using POS.Helper;

namespace POS.MediatR.CommandAndQuery
{
    public class DeleteSalesOrderCommand : IRequest<ServiceResponse<bool>>
    {
        public Guid Id { get; set; }
    }
   
}
