using Microsoft.EntityFrameworkCore;
using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Dto.PurchaseOrder;
using POS.Data.Entities;
using POS.Data.Resources;
using POS.Domain;
using POS.Helper;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace POS.Repository
{
    public class PurchaseOrderRepository
        : GenericRepository<PurchaseOrder, POSDbContext>, IPurchaseOrderRepository
    {
        private readonly IPropertyMappingService _propertyMappingService;
        private readonly UserInfoToken _userInfoToken;
        private readonly IPurchaseOrderItemTaxRepository _purchaseOrderItemTaxRepository;

        public PurchaseOrderRepository(IUnitOfWork<POSDbContext> uow,
            IPropertyMappingService propertyMappingService,
            UserInfoToken userInfoToken,
            IPurchaseOrderItemTaxRepository purchaseOrderItemTaxRepository) : base(uow)
        {
            _propertyMappingService = propertyMappingService;
            _userInfoToken = userInfoToken;
            _purchaseOrderItemTaxRepository = purchaseOrderItemTaxRepository;
        }

        public async Task<PurchaseOrderList> GetAllPurchaseOrders(PurchaseOrderResource purchaseOrderResource)
        {
            var collectionBeforePaging = AllIncluding(c => c.Supplier, b => b.Location, u => u.CreatedByUser, u => u.PurchaseOrderItems)
                .ApplySort(purchaseOrderResource.OrderBy,
                _propertyMappingService.GetPropertyMapping<PurchaseOrderDto, PurchaseOrder>());


            collectionBeforePaging = collectionBeforePaging
               .Where(a => a.IsPurchaseOrderRequest == purchaseOrderResource.IsPurchaseOrderRequest);

            if (purchaseOrderResource.Status != PurchaseOrderStatus.All)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.Status == purchaseOrderResource.Status);
            }

            if (purchaseOrderResource.SupplierId.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.SupplierId == purchaseOrderResource.SupplierId);
            }

            if (purchaseOrderResource.ProductId.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.PurchaseOrderItems.Any(c => c.ProductId == purchaseOrderResource.ProductId));
            }

            if (purchaseOrderResource.FromDate.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.POCreatedDate >= purchaseOrderResource.FromDate);
            }
            if (purchaseOrderResource.ToDate.HasValue)
            {
                var toDate = purchaseOrderResource.ToDate.Value.AddDays(1);
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.POCreatedDate < toDate);
            }

            if (!string.IsNullOrWhiteSpace(purchaseOrderResource.SupplierName))
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.Supplier.SupplierName.ToLower() == purchaseOrderResource.SupplierName.GetUnescapestring());
            }

            if (purchaseOrderResource.POCreatedDate.HasValue)
            {
                var toDate = purchaseOrderResource.POCreatedDate.Value.AddDays(1);
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.POCreatedDate >= purchaseOrderResource.POCreatedDate && a.POCreatedDate < toDate);
            }

            if (!string.IsNullOrWhiteSpace(purchaseOrderResource.OrderNumber))
            {
                var orderNumber = purchaseOrderResource.OrderNumber.Trim().ToLower();
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => EF.Functions.Like(a.OrderNumber.ToLower(), $"%{orderNumber}%"));
            }

            if (purchaseOrderResource.LocationId.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.LocationId == purchaseOrderResource.LocationId);
            }
            else
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => _userInfoToken.LocationIds.Contains(a.LocationId));
            }

            if (purchaseOrderResource.PaymentStatus.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.PaymentStatus == purchaseOrderResource.PaymentStatus);
            }

            if (purchaseOrderResource.DeliveryStatus.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.DeliveryStatus == purchaseOrderResource.DeliveryStatus);
            }

            var purchaseOrders = new PurchaseOrderList();
            return await purchaseOrders
                .Create(collectionBeforePaging, purchaseOrderResource.Skip, purchaseOrderResource.PageSize);
        }

        public async Task<PurchaseOrderList> GetAllPurchaseOrdersReport(PurchaseOrderResource purchaseOrderResource)
        {
            var collectionBeforePaging = AllIncluding(c => c.Supplier, c => c.PurchaseOrderItems).ApplySort(purchaseOrderResource.OrderBy,
                _propertyMappingService.GetPropertyMapping<PurchaseOrderDto, PurchaseOrder>());


            collectionBeforePaging = collectionBeforePaging
               .Where(a => a.IsPurchaseOrderRequest == purchaseOrderResource.IsPurchaseOrderRequest);

            if (purchaseOrderResource.SupplierId.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.SupplierId == purchaseOrderResource.SupplierId);
            }



            if (!string.IsNullOrWhiteSpace(purchaseOrderResource.SupplierName))
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.Supplier.SupplierName.ToLower() == purchaseOrderResource.SupplierName.GetUnescapestring());
            }

            if (purchaseOrderResource.POCreatedDate.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.POCreatedDate == purchaseOrderResource.POCreatedDate);
            }

            if (!string.IsNullOrWhiteSpace(purchaseOrderResource.OrderNumber))
            {
                var orderNumber = purchaseOrderResource.OrderNumber.Trim().ToLower();
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => EF.Functions.Like(a.OrderNumber.ToLower(), $"%{orderNumber}%"));
            }


            var purchaseOrders = new PurchaseOrderList();
            return await purchaseOrders
                .Create(collectionBeforePaging, 0, 0);
        }

        public async Task<PurchaseSalesTotalDto> GetAllPurchaseOrdersTotal(PurchaseOrderResource purchaseOrderResource)
        {
            var collectionBeforePaging = AllIncluding(c => c.Supplier, b => b.Location).ApplySort(purchaseOrderResource.OrderBy,
                _propertyMappingService.GetPropertyMapping<PurchaseOrderDto, PurchaseOrder>());


            collectionBeforePaging = collectionBeforePaging
               .Where(a => a.IsPurchaseOrderRequest == purchaseOrderResource.IsPurchaseOrderRequest);

            if (purchaseOrderResource.Status != PurchaseOrderStatus.All)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.Status == purchaseOrderResource.Status);
            }

            if (purchaseOrderResource.SupplierId.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.SupplierId == purchaseOrderResource.SupplierId);
            }

            if (purchaseOrderResource.ProductId.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.PurchaseOrderItems.Any(c => c.ProductId == purchaseOrderResource.ProductId));
            }

            if (purchaseOrderResource.FromDate.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.POCreatedDate >= purchaseOrderResource.FromDate);
            }
            if (purchaseOrderResource.ToDate.HasValue)
            {
                var toDate = purchaseOrderResource.ToDate.Value.AddDays(1);
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.POCreatedDate < toDate);
            }

            if (!string.IsNullOrWhiteSpace(purchaseOrderResource.SupplierName))
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.Supplier.SupplierName.ToLower() == purchaseOrderResource.SupplierName.GetUnescapestring());
            }

            if (purchaseOrderResource.POCreatedDate.HasValue)
            {
                var toDate = purchaseOrderResource.POCreatedDate.Value.AddDays(1);
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.POCreatedDate >= purchaseOrderResource.POCreatedDate && a.POCreatedDate < toDate);
            }

            if (!string.IsNullOrWhiteSpace(purchaseOrderResource.OrderNumber))
            {
                var orderNumber = purchaseOrderResource.OrderNumber.Trim().ToLower();
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => EF.Functions.Like(a.OrderNumber.ToLower(), $"%{orderNumber}%"));
            }

            if (purchaseOrderResource.LocationId.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.LocationId == purchaseOrderResource.LocationId);
            }
            else
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => _userInfoToken.LocationIds.Contains(a.LocationId));
            }

            if (purchaseOrderResource.PaymentStatus.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.PaymentStatus == purchaseOrderResource.PaymentStatus);
            }

            if (purchaseOrderResource.DeliveryStatus.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.DeliveryStatus == purchaseOrderResource.DeliveryStatus);
            }

            var result = await collectionBeforePaging
                .GroupBy(c => 1)
                .Select(d => new PurchaseSalesTotalDto
                {
                    GrandTotalAmount = d.Sum(c => c.TotalAmount),
                    GrandTotalTaxAmount = d.Sum(c => c.TotalTax),
                }).FirstOrDefaultAsync();

            return result;
        }

        public async Task<List<PurchaseOrderItemTaxDto>> GetAllPurchaseOrderItemTaxTotal(PurchaseOrderResource purchaseOrderResource)
        {
            var collectionBeforePaging = _purchaseOrderItemTaxRepository.All
                .Include(c => c.PurchaseOrderItem)
                    .ThenInclude(c => c.PurchaseOrder)
                    .ThenInclude(c => c.Supplier)
                .Include(d => d.Tax)
                .Where(c => !c.PurchaseOrderItem.PurchaseOrder.IsPurchaseOrderRequest
                    && !c.PurchaseOrderItem.PurchaseOrder.IsDeleted);


            collectionBeforePaging = collectionBeforePaging
               .Where(a => a.PurchaseOrderItem.PurchaseOrder.SupplierId == purchaseOrderResource.SupplierId);

            if (purchaseOrderResource.LocationId.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.PurchaseOrderItem.PurchaseOrder.LocationId == purchaseOrderResource.LocationId);
            }
            else
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => _userInfoToken.LocationIds.Contains(a.PurchaseOrderItem.PurchaseOrder.LocationId));
            }

            if (purchaseOrderResource.FromDate.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.PurchaseOrderItem.PurchaseOrder.POCreatedDate >= purchaseOrderResource.FromDate);
            }
            if (purchaseOrderResource.ToDate.HasValue)
            {
                var toDate = purchaseOrderResource.ToDate.Value.AddDays(1);
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.PurchaseOrderItem.PurchaseOrder.POCreatedDate < toDate);
            }

            if (!string.IsNullOrWhiteSpace(purchaseOrderResource.SupplierName))
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.PurchaseOrderItem.PurchaseOrder.Supplier.SupplierName.ToLower() == purchaseOrderResource.SupplierName.GetUnescapestring());
            }

            if (purchaseOrderResource.POCreatedDate.HasValue)
            {
                var toDate = purchaseOrderResource.POCreatedDate.Value.AddDays(1);
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.PurchaseOrderItem.PurchaseOrder.POCreatedDate >= purchaseOrderResource.POCreatedDate
                            && a.PurchaseOrderItem.PurchaseOrder.POCreatedDate < toDate);
            }

            if (!string.IsNullOrWhiteSpace(purchaseOrderResource.OrderNumber))
            {
                var orderNumber = purchaseOrderResource.OrderNumber.Trim().ToLower();
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => EF.Functions.Like(a.PurchaseOrderItem.PurchaseOrder.OrderNumber.ToLower(), $"%{orderNumber}%"));
            }

            var result = await collectionBeforePaging
                .GroupBy(c => c.TaxId)
                .Select(d => new PurchaseOrderItemTaxDto
                {
                    TaxName = d.FirstOrDefault().Tax.Name,
                    TaxValue = d.Sum(x => x.PurchaseOrderItem.Status == PurchaseSaleItemStatusEnum.Return ? (-1 * x.PurchaseOrderItem.TaxValue) : x.PurchaseOrderItem.TaxValue)
                }).ToListAsync();

            return result;
        }
    }
}
