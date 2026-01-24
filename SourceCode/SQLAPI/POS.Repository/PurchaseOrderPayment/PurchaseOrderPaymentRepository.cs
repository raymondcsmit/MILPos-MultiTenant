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
    public class PurchaseOrderPaymentRepository
        : GenericRepository<PurchaseOrderPayment, POSDbContext>, IPurchaseOrderPaymentRepository
    {
        private readonly IPropertyMappingService _propertyMappingService;
        private readonly UserInfoToken _userInfoToken;
        public PurchaseOrderPaymentRepository(IUnitOfWork<POSDbContext> uow,
             IPropertyMappingService propertyMappingService,
             UserInfoToken userInfoToken)
          : base(uow)
        {
            _propertyMappingService = propertyMappingService;
            _userInfoToken = userInfoToken;
        }

        public async Task<PurchaseOrderPaymentList> GetAllPurchaseOrderPayments(PurchaseOrderResource purchaseOrderResource)
        {
            var collectionBeforePaging = AllIncluding(c => c.PurchaseOrder).ApplySort(purchaseOrderResource.OrderBy,
                _propertyMappingService.GetPropertyMapping<PurchaseOrderPaymentDto, PurchaseOrderPayment>());


            if (purchaseOrderResource.FromDate.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.PaymentDate >= purchaseOrderResource.FromDate.Value);
            }
            if (purchaseOrderResource.ToDate.HasValue)
            {
                var toDate = purchaseOrderResource.ToDate.Value.AddDays(1);
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.PaymentDate < toDate);
            }
            if (purchaseOrderResource.LocationId.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.PurchaseOrder.LocationId == purchaseOrderResource.LocationId);
            }
            else
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => _userInfoToken.LocationIds.Contains(a.PurchaseOrder.LocationId));
            }


            var purchaseOrderPaymentList = new PurchaseOrderPaymentList();
            return await purchaseOrderPaymentList
                .Create(collectionBeforePaging, purchaseOrderResource.Skip, purchaseOrderResource.PageSize);
        }
    }
}
