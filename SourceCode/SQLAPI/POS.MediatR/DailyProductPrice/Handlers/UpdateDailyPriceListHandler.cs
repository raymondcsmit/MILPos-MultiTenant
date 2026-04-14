using MediatR;
using POS.Data;
using POS.Helper;
using POS.MediatR.DailyProductPrice.Commands;
using POS.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.DailyProductPrice.Handlers
{
    public class UpdateDailyPriceListHandler : IRequestHandler<UpdateDailyPriceListCommand, ServiceResponse<bool>>
    {
        private readonly IDailyProductPriceRepository _dailyProductPriceRepository;

        public UpdateDailyPriceListHandler(IDailyProductPriceRepository dailyProductPriceRepository)
        {
            _dailyProductPriceRepository = dailyProductPriceRepository;
        }

        public async Task<ServiceResponse<bool>> Handle(UpdateDailyPriceListCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var prices = request.Prices.Select(p => new Data.DailyProductPrice
                {
                    ProductId = p.ProductId,
                    PriceDate = request.PriceDate.Date,
                    SalesPrice = p.SalesPrice,
                    Mrp = p.Mrp,
                    IsActive = p.IsActive
                }).ToList();

                var result = await _dailyProductPriceRepository.BulkUpsertDailyPrices(prices);

                if (result)
                {
                    return ServiceResponse<bool>.ReturnResultWith200(true);
                }
                else
                {
                    return ServiceResponse<bool>.ReturnFailed(500, "Failed to update prices");
                }
            }
            catch (Exception ex)
            {
                return ServiceResponse<bool>.ReturnException(ex);
            }
        }
    }
}
