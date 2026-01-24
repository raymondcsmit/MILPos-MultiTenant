using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data.Entities.Accounts;
using POS.Domain;

namespace POS.Repository.Accouting;
public class LoanRepaymentRepository(IUnitOfWork<POSDbContext> uow) : GenericRepository<LoanRepayment, POSDbContext>(uow),
          ILoanRepaymentRepository
{

}

