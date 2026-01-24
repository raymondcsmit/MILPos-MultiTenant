using Microsoft.EntityFrameworkCore;
using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Dto.PurchaseOrder;
using POS.Data.Dto.SalesOrder;
using POS.Data.Entities;
using POS.Data.Resources;
using POS.Domain;
using POS.Helper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace POS.Repository
{
    public class SalesOrderRepository
        : GenericRepository<SalesOrder, POSDbContext>, ISalesOrderRepository
    {
        private readonly IPropertyMappingService _propertyMappingService;
        private readonly UserInfoToken _userInfoToken;
        private readonly ISalesOrderItemTaxRepository _salesOrderItemTaxRepository;
        public SalesOrderRepository(IUnitOfWork<POSDbContext> uow,
            IPropertyMappingService propertyMappingService,
            UserInfoToken userInfoToken,
            ISalesOrderItemTaxRepository salesOrderItemTaxRepository) : base(uow)
        {
            _propertyMappingService = propertyMappingService;
            _userInfoToken = userInfoToken;
            _salesOrderItemTaxRepository = salesOrderItemTaxRepository;
        }
        public async Task<SalesOrderList> GetAllSalesOrders(SalesOrderResource salesOrderResource)
        {
            var collectionBeforePaging = AllIncluding(c => c.Customer, cs => cs.CreatedByUser, cs => cs.Location, cs => cs.SalesOrderItems).ApplySort(salesOrderResource.OrderBy,
                _propertyMappingService.GetPropertyMapping<SalesOrderDto, SalesOrder>());


            collectionBeforePaging = collectionBeforePaging
               .Where(a => a.IsSalesOrderRequest == salesOrderResource.IsSalesOrderRequest);

            if (salesOrderResource.Status != SalesOrderStatus.All)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.Status == salesOrderResource.Status);
            }

            if (salesOrderResource.CustomerId.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.CustomerId == salesOrderResource.CustomerId);
            }

            if (salesOrderResource.ProductId.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.SalesOrderItems.Any(c => c.ProductId == salesOrderResource.ProductId));
            }

            if (salesOrderResource.FromDate.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.SOCreatedDate >= salesOrderResource.FromDate.Value);
            }
            if (salesOrderResource.ToDate.HasValue)
            {
                var toDate = salesOrderResource.ToDate.Value.AddDays(1);
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.SOCreatedDate < toDate);
            }

            if (!string.IsNullOrWhiteSpace(salesOrderResource.CustomerName))
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.Customer.CustomerName == salesOrderResource.CustomerName.GetUnescapestring());
            }

            if (salesOrderResource.SOCreatedDate.HasValue)
            {
                var toDate = salesOrderResource.SOCreatedDate.Value.AddDays(1);
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.SOCreatedDate >= salesOrderResource.SOCreatedDate && a.SOCreatedDate < toDate);
            }

            if (!string.IsNullOrWhiteSpace(salesOrderResource.OrderNumber))
            {
                var orderNumber = salesOrderResource.OrderNumber.Trim();
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => EF.Functions.Like(a.OrderNumber, $"%{orderNumber}%"));
            }

            if (salesOrderResource.PaymentStatus.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.PaymentStatus == salesOrderResource.PaymentStatus);
            }

            if (salesOrderResource.DeliveryStatus.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.DeliveryStatus == salesOrderResource.DeliveryStatus);
            }

            if (salesOrderResource.LocationId.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.LocationId == salesOrderResource.LocationId);
            }
            else
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => _userInfoToken.LocationIds.Contains(a.LocationId));
            }


            var salesOrders = new SalesOrderList();
            return await salesOrders
                .Create(collectionBeforePaging, salesOrderResource.Skip, salesOrderResource.PageSize);
        }

        public async Task<SalesOrderList> GetAllSalesOrdersReturns(SalesOrderResource salesOrderResource)
        {
            var collectionBeforePaging = AllIncluding(c => c.Customer, cs => cs.CreatedByUser, cs => cs.Location, cs => cs.SalesOrderItems).ApplySort(salesOrderResource.OrderBy,
                _propertyMappingService.GetPropertyMapping<SalesOrderDto, SalesOrder>());


            collectionBeforePaging = collectionBeforePaging
               .Where(a => a.IsSalesOrderRequest == salesOrderResource.IsSalesOrderRequest);


            if (!string.IsNullOrWhiteSpace(salesOrderResource.OrderNumber))
            {
                var orderNumber = salesOrderResource.OrderNumber.Trim();
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => EF.Functions.Like(a.OrderNumber, $"%{orderNumber}%"));
            }

            if (salesOrderResource.CustomerId.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.CustomerId == salesOrderResource.CustomerId);
            }

            if (salesOrderResource.ProductId.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.SalesOrderItems.Any(c => c.ProductId == salesOrderResource.ProductId));
            }

            if (salesOrderResource.FromDate.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.SOCreatedDate >= salesOrderResource.FromDate.Value);
            }
            if (salesOrderResource.ToDate.HasValue)
            {
                var toDate = salesOrderResource.ToDate.Value.AddDays(1);
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.SOCreatedDate < toDate);
            }

            if (!string.IsNullOrWhiteSpace(salesOrderResource.CustomerName))
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.Customer.CustomerName == salesOrderResource.CustomerName.GetUnescapestring());
            }

            if (salesOrderResource.SOCreatedDate.HasValue)
            {
                var toDate = salesOrderResource.SOCreatedDate.Value.AddDays(1);
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.SOCreatedDate >= salesOrderResource.SOCreatedDate && a.SOCreatedDate < toDate);
            }



            if (salesOrderResource.PaymentStatus.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.PaymentStatus == salesOrderResource.PaymentStatus);
            }

            if (salesOrderResource.DeliveryStatus.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.DeliveryStatus == salesOrderResource.DeliveryStatus);
            }

            if (salesOrderResource.LocationId.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.LocationId == salesOrderResource.LocationId);
            }
            else
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => _userInfoToken.LocationIds.Contains(a.LocationId));
            }


            var salesOrders = new SalesOrderList();
            return await salesOrders
                .Create(collectionBeforePaging, salesOrderResource.Skip, salesOrderResource.PageSize);
        }

        public async Task<PurchaseSalesTotalDto> GetAllSalesOrdersTotal(SalesOrderResource salesOrderResource)
        {
            var collectionBeforePaging = AllIncluding(c => c.Customer, cs => cs.CreatedByUser, cs => cs.Location).ApplySort(salesOrderResource.OrderBy,
                _propertyMappingService.GetPropertyMapping<SalesOrderDto, SalesOrder>());

            collectionBeforePaging = collectionBeforePaging.Where(c => !c.IsSalesOrderRequest);

            collectionBeforePaging = collectionBeforePaging
               .Where(a => a.IsSalesOrderRequest == salesOrderResource.IsSalesOrderRequest);

            if (salesOrderResource.Status != SalesOrderStatus.All)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.Status == salesOrderResource.Status);
            }

            if (salesOrderResource.CustomerId.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.CustomerId == salesOrderResource.CustomerId);
            }

            if (salesOrderResource.ProductId.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.SalesOrderItems.Any(c => c.ProductId == salesOrderResource.ProductId));
            }

            if (salesOrderResource.FromDate.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.SOCreatedDate >= salesOrderResource.FromDate.Value);
            }
            if (salesOrderResource.ToDate.HasValue)
            {
                var toDate = salesOrderResource.ToDate.Value.AddDays(1);
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.SOCreatedDate < toDate);
            }

            if (!string.IsNullOrWhiteSpace(salesOrderResource.CustomerName))
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.Customer.CustomerName == salesOrderResource.CustomerName.GetUnescapestring());
            }

            if (salesOrderResource.SOCreatedDate.HasValue)
            {
                var toDate = salesOrderResource.SOCreatedDate.Value.AddDays(1);
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.SOCreatedDate >= salesOrderResource.SOCreatedDate && a.SOCreatedDate < toDate);
            }

            if (!string.IsNullOrWhiteSpace(salesOrderResource.OrderNumber))
            {
                var orderNumber = salesOrderResource.OrderNumber.Trim();
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => EF.Functions.Like(a.OrderNumber, $"%{orderNumber}%"));
            }

            if (salesOrderResource.PaymentStatus.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.PaymentStatus == salesOrderResource.PaymentStatus);
            }

            if (salesOrderResource.DeliveryStatus.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.DeliveryStatus == salesOrderResource.DeliveryStatus);
            }

            if (salesOrderResource.LocationId.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.LocationId == salesOrderResource.LocationId);
            }
            else
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => _userInfoToken.LocationIds.Contains(a.LocationId));
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

        public async Task<List<SalesOrderItemTaxDto>> GetAllSalesOrdersItemTaxTotal(SalesOrderResource salesOrderResource)
        {
            var collectionBeforePaging = _salesOrderItemTaxRepository.All
                .Include(c => c.SalesOrderItem)
                    .ThenInclude(c => c.SalesOrder)
                    .ThenInclude(c => c.Customer)
                .Include(d => d.Tax)
                .Where(c => !c.SalesOrderItem.SalesOrder.IsSalesOrderRequest
                    && !c.SalesOrderItem.SalesOrder.IsDeleted);


            collectionBeforePaging = collectionBeforePaging
               .Where(a => a.SalesOrderItem.SalesOrder.CustomerId == salesOrderResource.CustomerId);

            if (salesOrderResource.LocationId.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.SalesOrderItem.SalesOrder.LocationId == salesOrderResource.LocationId);
            }
            else
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => _userInfoToken.LocationIds.Contains(a.SalesOrderItem.SalesOrder.LocationId));
            }

            if (salesOrderResource.FromDate.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.SalesOrderItem.SalesOrder.SOCreatedDate >= salesOrderResource.FromDate);
            }
            if (salesOrderResource.ToDate.HasValue)
            {
                var toDate = salesOrderResource.ToDate.Value.AddDays(1);
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.SalesOrderItem.SalesOrder.SOCreatedDate < toDate);
            }

            if (!string.IsNullOrWhiteSpace(salesOrderResource.CustomerName))
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.SalesOrderItem.SalesOrder.Customer.CustomerName == salesOrderResource.CustomerName.GetUnescapestring());
            }

            if (salesOrderResource.SOCreatedDate.HasValue)
            {
                var toDate = salesOrderResource.SOCreatedDate.Value.AddDays(1);
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.SalesOrderItem.SalesOrder.SOCreatedDate >= salesOrderResource.SOCreatedDate
                            && a.SalesOrderItem.SalesOrder.SOCreatedDate < toDate);
            }

            if (!string.IsNullOrWhiteSpace(salesOrderResource.OrderNumber))
            {
                var orderNumber = salesOrderResource.OrderNumber.Trim();
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => EF.Functions.Like(a.SalesOrderItem.SalesOrder.OrderNumber, $"%{orderNumber}%"));
            }

            var result = await collectionBeforePaging
                .GroupBy(c => c.TaxId)
                .Select(d => new SalesOrderItemTaxDto
                {
                    TaxName = d.FirstOrDefault().Tax.Name,
                    TaxValue = d.Sum(x => x.SalesOrderItem.Status == PurchaseSaleItemStatusEnum.Return ? (-1 * x.SalesOrderItem.TaxValue) : x.SalesOrderItem.TaxValue)
                }).ToListAsync();

            return result;
        }

        public async Task<PendingSalesOrderList> GetAllPendingSalesOrder(PendingSalesOrderResource pendingSalesOrderResource)
        {
            var collectionBeforePaging = All
                .Where(c => (c.PaymentStatus == PaymentStatus.Pending || c.PaymentStatus == PaymentStatus.Partial) && !c.IsSalesOrderRequest)
               .Include(c => c.SalesOrderPayments)
               .Include(c => c.Customer).ApplySort(pendingSalesOrderResource.OrderBy,
                _propertyMappingService.GetPropertyMapping<CustomerSalesOrderDto, SalesOrder>());

            if (pendingSalesOrderResource.CustomerId.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.CustomerId == pendingSalesOrderResource.CustomerId.Value);
            }

            if (!string.IsNullOrWhiteSpace(pendingSalesOrderResource.OrderNumber))
            {
                var orderNumber = pendingSalesOrderResource.OrderNumber.Trim();
                collectionBeforePaging = collectionBeforePaging
                     .Where(a => a.OrderNumber.Contains(orderNumber));
            }
            if (!string.IsNullOrWhiteSpace(pendingSalesOrderResource.CustomerName))
            {
                var orderNumber = pendingSalesOrderResource.CustomerName.Trim();
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.Customer.CustomerName.Contains(pendingSalesOrderResource.CustomerName));
            }

            if (pendingSalesOrderResource.PaymentStatus.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => a.PaymentStatus == pendingSalesOrderResource.PaymentStatus.Value);
            }
            if (pendingSalesOrderResource.FromDate.HasValue && pendingSalesOrderResource.ToDate.HasValue)
            {
                var startDate = pendingSalesOrderResource.FromDate.Value.ToLocalTime();
                var endDate = pendingSalesOrderResource.ToDate.Value.ToLocalTime();

                DateTime minDate = new DateTime(startDate.Year, startDate.Month, startDate.Day, 0, 0, 0);
                DateTime maxDate = new DateTime(endDate.Year, endDate.Month, endDate.Day, 23, 59, 59);

                collectionBeforePaging = collectionBeforePaging
                   .Where(a => a.SOCreatedDate >= minDate && a.SOCreatedDate <= maxDate);
            }


            var customerInvoiceList = new PendingSalesOrderList();
            return await customerInvoiceList.Create(
                  collectionBeforePaging,
                  pendingSalesOrderResource.Skip,
                  pendingSalesOrderResource.PageSize);
        }
    }
}
