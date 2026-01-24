using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data.Entities.Accounts;
using POS.Domain;

namespace POS.Repository.Accouting;
public class TransactionItemRepository : GenericRepository<TransactionItem, POSDbContext>,
          ITransactionItemRepository
{
    public TransactionItemRepository(
        IUnitOfWork<POSDbContext> uow
        ) : base(uow)
    {
    }
}
