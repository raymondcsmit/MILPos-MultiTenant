using MediatR;
using POS.Data.Dto;
using System;

namespace POS.MediatR.DailyProductPrice.Queries
{
    public class GetDailyPriceListQuery : IRequest<DailyPriceListDto>
    {
        public DateTime PriceDate { get; set; }
        public string GroupBy { get; set; } = "Category"; // "Category" or "Brand"
    }
}
