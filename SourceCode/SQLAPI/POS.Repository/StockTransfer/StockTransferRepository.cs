using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data.Dto;
using POS.Data.Resources;
using POS.Domain;

namespace POS.Repository
{
    public class StockTransferRepository : GenericRepository<Data.Entities.StockTransfer, POSDbContext>, IStockTransferRepository
    {
        private readonly IPropertyMappingService _propertyMappingService;
        public StockTransferRepository(
            IUnitOfWork<POSDbContext> uow,
            IPropertyMappingService propertyMappingService
            ) : base(uow)
        {
            _uow = uow;
            _propertyMappingService = propertyMappingService;
        }
        public async Task<StockTransferList> GetStockTranfers(StockTranferResource stockTranferResource)
        {
            var collectionBeforePaging = AllIncluding(f => f.FromLocation, t => t.ToLocation);
            collectionBeforePaging =
               collectionBeforePaging.ApplySort(stockTranferResource.OrderBy,
               _propertyMappingService.GetPropertyMapping<StockTransferDto, POS.Data.Entities.StockTransfer>());

            if (stockTranferResource.FromLocationId.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(c => c.FromLocationId == stockTranferResource.FromLocationId);
            }
            if (stockTranferResource.ToLocationId.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(c => c.ToLocationId == stockTranferResource.ToLocationId);
            }
            if (!string.IsNullOrWhiteSpace(stockTranferResource.ReferenceNo))
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(c => EF.Functions.Like(c.ReferenceNo, $"%{stockTranferResource.ReferenceNo}%"));
            }

            var loginAudits = new StockTransferList();
            return await loginAudits.Create(
                collectionBeforePaging,
                stockTranferResource.Skip,
                stockTranferResource.PageSize
                );
        }
    }
}
