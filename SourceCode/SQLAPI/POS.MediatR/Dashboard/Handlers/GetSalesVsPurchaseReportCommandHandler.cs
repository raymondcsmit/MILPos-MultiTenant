using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto;
using POS.MediatR.Dashboard.Commands;
using POS.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Dashboard.Handlers
{
    public class GetSalesVsPurchaseReportCommandHandler
        : IRequestHandler<GetSalesVsPurchaseReportCommand, List<SalesVsPurchaseDto>>
    {
        private readonly ISalesOrderRepository _salesOrderRepository;
        private readonly IPurchaseOrderRepository _purchaseOrderRepository;
        private readonly UserInfoToken _userInfoToken;

        public GetSalesVsPurchaseReportCommandHandler(ISalesOrderRepository salesOrderRepository,
            IPurchaseOrderRepository purchaseOrderRepository,
            UserInfoToken userInfoToken)
        {
            _salesOrderRepository = salesOrderRepository;
            _purchaseOrderRepository = purchaseOrderRepository;
            _userInfoToken = userInfoToken;
        }

        public async Task<List<SalesVsPurchaseDto>> Handle(GetSalesVsPurchaseReportCommand request, CancellationToken cancellationToken)
        {
            var locationIds = new List<Guid>();
            if (request.LocationId.HasValue)
            {
                locationIds.Add(request.LocationId.Value);
            }
            else
            {
                locationIds = _userInfoToken.LocationIds;
            }

            var result = new List<SalesVsPurchaseDto>();
            var salesOrders = await _salesOrderRepository
                .All
                .Where(p => !p.IsSalesOrderRequest
                    && locationIds.Contains(p.LocationId)
                    && p.SOCreatedDate >= request.FromDate
                    && p.SOCreatedDate < request.ToDate.AddDays(1)
                )
                .GroupBy(c => new { c.SOCreatedDate.Day, c.SOCreatedDate.Month, c.SOCreatedDate.Year })
                .Select(p => new SalesVsPurchaseDto
                {
                    Date = new DateTime(p.Key.Year, p.Key.Month, p.Key.Day).ToUniversalTime(),
                    TotalSales = p.Sum(c => c.TotalAmount),
                    TotalPurchase = 0
                }).ToListAsync();
            result.AddRange(salesOrders);

            var purchaseOrders = await _purchaseOrderRepository
                .All
                .Where(p => !p.IsPurchaseOrderRequest
                    && locationIds.Contains(p.LocationId)
                    && p.POCreatedDate >= request.FromDate
                    && p.POCreatedDate < request.ToDate.AddDays(1)
                )
                .GroupBy(c => new { c.POCreatedDate.Day, c.POCreatedDate.Month, c.POCreatedDate.Year })
                .Select(p => new SalesVsPurchaseDto
                {
                    Date = new DateTime(p.Key.Year, p.Key.Month, p.Key.Day).ToUniversalTime(),
                    TotalPurchase = p.Sum(c => c.TotalAmount),
                    TotalSales = 0
                }).ToListAsync();
            result.AddRange(purchaseOrders);

            result = result.GroupBy(c => c.Date)
                .Select(cs => new SalesVsPurchaseDto
                {
                    Date = cs.Key,
                    TotalPurchase = cs.Sum(c => c.TotalPurchase),
                    TotalSales = cs.Sum(c => c.TotalSales)
                }).ToList();

            return result;
        }
    }
}
