using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Domain;


namespace POS.Repository
{
    public class TableSettingRepository : GenericRepository<Data.Entities.TableSetting, POSDbContext>, ITableSettingRepository
    {
        private readonly IPropertyMappingService _propertyMappingService;
        public TableSettingRepository(
            IUnitOfWork<POSDbContext> uow,
            IPropertyMappingService propertyMappingService
            ) : base(uow)
        {
            _uow = uow;
            _propertyMappingService = propertyMappingService;
        }
    }
}
