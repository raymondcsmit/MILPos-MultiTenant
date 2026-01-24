using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data.Entities;
using POS.Domain;

namespace POS.Repository
{
    public class LocationRepository : GenericRepository<Location, POSDbContext>, ILocationRepository
    {
        public LocationRepository(IUnitOfWork<POSDbContext> uow)
          : base(uow)
        {
        }
    }
}