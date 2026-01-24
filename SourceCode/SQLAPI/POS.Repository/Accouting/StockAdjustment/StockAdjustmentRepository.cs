using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data.Entities.Accounts;
using POS.Domain;

namespace POS.Repository.Accouting;
public class StockAdjustmentRepository : GenericRepository<StockAdjustment, POSDbContext>,
          IStockAdjustmentRepository
{
    public StockAdjustmentRepository(
        IUnitOfWork<POSDbContext> uow
        ) : base(uow)
    {
    }
}

