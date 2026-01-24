using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data.Entities;
using POS.Domain;

namespace POS.Repository
{
    public class LanguageRepository : GenericRepository<Language, POSDbContext>, ILanguageRepository
    {
        public LanguageRepository(IUnitOfWork<POSDbContext> uow)
          : base(uow)
        {
        }
    }
}