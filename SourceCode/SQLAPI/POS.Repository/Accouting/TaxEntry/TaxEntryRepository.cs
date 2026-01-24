using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data.Entities.Accounts;
using POS.Domain;

namespace POS.Repository.Accouting;
public class TaxEntryRepository : GenericRepository<TaxEntry, POSDbContext>,
          ITaxEntryRepository
{
    public TaxEntryRepository(
        IUnitOfWork<POSDbContext> uow
        ) : base(uow)
    {
    }
}


