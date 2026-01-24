using POS.Data.Dto;
using POS.MediatR.CommandAndQuery;
using POS.Repository;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Threading;
using System.Threading.Tasks;
using System.Linq;
using POS.Data.Entities;
using System;
using System.Collections.Generic;

namespace POS.MediatR.Handlers
{
    public class DashboardStaticaticsQueryHandler : IRequestHandler<DashboardStaticaticsQuery, DashboardStatics>
    {
        private readonly IPurchaseOrderRepository _purchaseOrderRepository;
        private readonly ISalesOrderItemRepository _salesOrderItemRepository;
        private readonly ISalesOrderRepository _salesOrderRepository;
        private readonly IPurchaseOrderItemRepository _purchaseOrderItemRepository;
        private readonly UserInfoToken _userInfoToken;

        public DashboardStaticaticsQueryHandler(
            IPurchaseOrderRepository purchaseOrderRepository,
            ISalesOrderItemRepository salesOrderItemRepository,
            ISalesOrderRepository salesOrderRepository,
            IPurchaseOrderItemRepository purchaseOrderItemRepository,
            UserInfoToken userInfoToken)
        {
            _purchaseOrderRepository = purchaseOrderRepository;
            _salesOrderRepository = salesOrderRepository;
            _salesOrderItemRepository = salesOrderItemRepository;
            _purchaseOrderItemRepository = purchaseOrderItemRepository;
            _userInfoToken = userInfoToken;
        }
        public async Task<DashboardStatics> Handle(DashboardStaticaticsQuery request, CancellationToken cancellationToken)
        {
            var locationIds = new List<Guid>();
            if (request.LocationId.HasValue)
            {
                locationIds = [request.LocationId.Value];
            }
            else
            {
                locationIds = _userInfoToken.LocationIds;
            }
            var fromDate = request.FromDate;
            var toDate = request.ToDate.AddDays(1);
            var dashboardStatics = new DashboardStatics();

            dashboardStatics.TotalPurchase = await _purchaseOrderRepository.All
                .Where(c => !c.IsPurchaseOrderRequest && locationIds.Contains(c.LocationId) && c.POCreatedDate >= fromDate && c.POCreatedDate < toDate)
                .SumAsync(c => c.TotalAmount);

            dashboardStatics.TotalSales = await _salesOrderRepository.All
                .Where(c => !c.IsSalesOrderRequest && locationIds.Contains(c.LocationId) && c.SOCreatedDate >= fromDate && c.SOCreatedDate < toDate)
                .SumAsync(c => c.TotalAmount);

            dashboardStatics.TotalSalesReturn = await _salesOrderItemRepository
                .AllIncluding(d => d.SalesOrder)
                .Where(c => c.Status == PurchaseSaleItemStatusEnum.Return
                        && locationIds.Contains(c.SalesOrder.LocationId)
                        && c.SalesOrder.SOCreatedDate >= fromDate
                        && c.SalesOrder.SOCreatedDate < toDate)
                .SumAsync(c => (c.UnitPrice * c.Quantity) + c.TaxValue - c.Discount);

            dashboardStatics.TotalPurchaseReturn = await _purchaseOrderItemRepository.AllIncluding(c => c.PurchaseOrder)
                .Where(c => c.Status == PurchaseSaleItemStatusEnum.Return
                    && locationIds.Contains(c.PurchaseOrder.LocationId)
                        && c.PurchaseOrder.POCreatedDate >= fromDate
                        && c.PurchaseOrder.POCreatedDate < toDate)
                .SumAsync(c => (c.UnitPrice * c.Quantity) + c.TaxValue - c.Discount);

            return dashboardStatics;
        }
    }
}
