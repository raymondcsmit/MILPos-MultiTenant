using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data.Entities;
using POS.Domain;


namespace POS.Repository
{
    public class VariantRepository : GenericRepository<Variant, POSDbContext>,
           IVariantRepository
    {
        public VariantRepository(
            IUnitOfWork<POSDbContext> uow
            ) : base(uow)
        {

        }
    }
}