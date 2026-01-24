using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data.Entities;
using POS.Domain;

namespace POS.Repository
{
    public class PageHelperRepository : GenericRepository<PageHelper, POSDbContext>,
          IPageHelperRepository
    {
        public PageHelperRepository(
            IUnitOfWork<POSDbContext> uow
            ) : base(uow)
        {
        }
    }
}