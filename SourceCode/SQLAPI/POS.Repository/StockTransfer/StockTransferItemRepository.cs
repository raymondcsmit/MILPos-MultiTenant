using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data.Entities;
using POS.Domain;

namespace POS.Repository
{
    public class StockTransferItemRepository 
        : GenericRepository<StockTransferItem, POSDbContext>, IStockTransferItemRepository
    {
        public StockTransferItemRepository(
            IUnitOfWork<POSDbContext> uow) : base(uow)
        {
        }
    }
}
