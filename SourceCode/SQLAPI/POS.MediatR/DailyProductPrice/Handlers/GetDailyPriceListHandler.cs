using MediatR;
using POS.Data.Dto;
using POS.MediatR.DailyProductPrice.Queries;
using POS.Repository;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.DailyProductPrice.Handlers
{
    public class GetDailyPriceListHandler : IRequestHandler<GetDailyPriceListQuery, DailyPriceListDto>
    {
        private readonly IDailyProductPriceRepository _dailyProductPriceRepository;

        public GetDailyPriceListHandler(IDailyProductPriceRepository dailyProductPriceRepository)
        {
            _dailyProductPriceRepository = dailyProductPriceRepository;
        }

        public async Task<DailyPriceListDto> Handle(GetDailyPriceListQuery request, CancellationToken cancellationToken)
        {
            return await _dailyProductPriceRepository.GetDailyPriceList(request.PriceDate);
        }
    }
}
