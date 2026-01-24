using MediatR;
using POS.Helper;
using System;

namespace POS.MediatR.Commands
{
    public class DeleteStockTransferCommand : IRequest<ServiceResponse<bool>>
    {
        public Guid Id { get; set; }
    }

}