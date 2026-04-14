using MediatR;
using POS.Data.Dto;
using POS.Helper;
using System;
using System.Collections.Generic;

namespace POS.MediatR.ProductStock.Commands
{
    public class BulkAdjustProductStockCommand : IRequest<ServiceResponse<bool>>
    {
        public List<ProductStockAdjustmentDto> Adjustments { get; set; } = new List<ProductStockAdjustmentDto>();
    }

    public class ProductStockAdjustmentDto
    {
        public Guid ProductId { get; set; }
        public Guid LocationId { get; set; }
        public decimal NewStockValue { get; set; }
    }
}
