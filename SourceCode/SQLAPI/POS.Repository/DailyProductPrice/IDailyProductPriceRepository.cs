using POS.Data;
using POS.Data.Dto;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace POS.Repository
{
    public interface IDailyProductPriceRepository
    {
        Task<DailyPriceListDto> GetDailyPriceList(DateTime priceDate);
        Task<DailyProductPrice> GetProductPriceForDate(Guid productId, DateTime priceDate);
        Task<decimal> GetEffectivePrice(Guid productId, DateTime priceDate);
        Task<bool> BulkUpsertDailyPrices(List<DailyProductPrice> prices);
        // Task<List<DailyPriceHistoryDto>> GetPriceHistory(Guid productId, DateTime startDate, DateTime endDate);
    }
}
