using System;
using System.Collections.Generic;

namespace POS.Data.Dto
{
    public class DailyPriceListDto
    {
        public DateTime PriceDate { get; set; }
        public List<DailyProductPriceDto> Prices { get; set; } = new List<DailyProductPriceDto>();
        public DailyPriceSummaryDto Summary { get; set; } = new DailyPriceSummaryDto();
    }
}
