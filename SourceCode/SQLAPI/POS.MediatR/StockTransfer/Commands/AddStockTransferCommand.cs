using System;
using System.Collections.Generic;
using MediatR;
using POS.Data.Dto;
using POS.Data.Enums;
using POS.Helper;

namespace POS.MediatR.Commands
{
    public class AddStockTransferCommand : IRequest<ServiceResponse<StockTransferDto>>
    {
        public DateTime TransferDate { get; set; }
        public string ReferenceNo { get; set; }
        public StockTransferStatus Status { get; set; }
        public Guid FromLocationId { get; set; }
        public Guid ToLocationId { get; set; }
        public decimal TotalShippingCharge { get; set; }
        public decimal TotalAmount { get; set; }
        public string Notes { get; set; }
        public List<StockTransferItemDto> StockTransferItems { get; set; }
    }
}
