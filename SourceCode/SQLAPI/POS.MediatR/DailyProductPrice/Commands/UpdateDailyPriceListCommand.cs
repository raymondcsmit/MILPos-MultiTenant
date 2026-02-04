using MediatR;
using POS.Helper;
using System;
using System.Collections.Generic;

namespace POS.MediatR.DailyProductPrice.Commands
{
    public class UpdateDailyPriceListCommand : IRequest<ServiceResponse<bool>>
    {
        public DateTime PriceDate { get; set; }
        public List<DailyPriceUpdateDto> Prices { get; set; }
    }

    public class DailyPriceUpdateDto
    {
        public Guid ProductId { get; set; }
        public decimal SalesPrice { get; set; }
        public decimal? Mrp { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
