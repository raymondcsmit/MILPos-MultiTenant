using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Resources;
using POS.Domain;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace POS.Repository
{
    public class SalesOrderPaymentRepository : GenericRepository<SalesOrderPayment, POSDbContext>, ISalesOrderPaymentRepository
    {
        private readonly IPropertyMappingService _propertyMappingService;
        private readonly UserInfoToken _userInfoToken;
        public SalesOrderPaymentRepository(IUnitOfWork<POSDbContext> uow,
             IPropertyMappingService propertyMappingService,
             UserInfoToken userInfoToken)
          : base(uow)
        {
            _propertyMappingService = propertyMappingService;
            _userInfoToken = userInfoToken;
        }


        public async Task<SaleOrderPaymentList> GetAllSaleOrderPayments(SalesOrderResource salesOrderResource)
        {
            var collectionBeforePaging = AllIncluding(c => c.SalesOrder).ApplySort(salesOrderResource.OrderBy,
                _propertyMappingService.GetPropertyMapping<SalesOrderPaymentDto, SalesOrderPayment>());


            if (salesOrderResource.FromDate.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.PaymentDate >= salesOrderResource.FromDate.Value);
            }
            if (salesOrderResource.ToDate.HasValue)
            {
                var toDate = salesOrderResource.ToDate.Value.AddDays(1);
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.PaymentDate < toDate);
            }
            if (salesOrderResource.LocationId.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.SalesOrder.LocationId == salesOrderResource.LocationId);
            }
            else
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => _userInfoToken.LocationIds.Contains(a.SalesOrder.LocationId));
            }


            var saleOrderPaymentList = new SaleOrderPaymentList();
            return await saleOrderPaymentList
                .Create(collectionBeforePaging, salesOrderResource.Skip, salesOrderResource.PageSize);
        }
    }
}
