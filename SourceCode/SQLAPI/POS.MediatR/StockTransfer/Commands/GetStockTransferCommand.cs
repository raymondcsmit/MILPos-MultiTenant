using System;
using MediatR;
using POS.Data.Dto;
using POS.Helper;

namespace POS.MediatR.Commands
{
    public class GetStockTransferCommand : IRequest<ServiceResponse<StockTransferDto>>
    {
        public Guid Id { get; set; }
    }
}
