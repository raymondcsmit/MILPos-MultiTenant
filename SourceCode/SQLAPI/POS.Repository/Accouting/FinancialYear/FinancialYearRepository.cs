using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data.Entities.Accounts;
using POS.Domain;


namespace POS.Repository.Accouting
{
    public class FinancialYearRepository(IUnitOfWork<POSDbContext> uow) : GenericRepository<FinancialYear, POSDbContext>(uow), IFinancialYearRepository
    {
    }
}
