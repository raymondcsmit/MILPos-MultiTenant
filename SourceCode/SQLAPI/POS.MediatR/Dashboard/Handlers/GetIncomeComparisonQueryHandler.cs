using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto;
using POS.Data.Dto.Dashboard;
using POS.MediatR.Dashboard.Commands;
using POS.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Dashboard.Handlers
{
    public class GetIncomeComparisonQueryHandler : IRequestHandler<GetIncomeComparisonQuery, List<IncomeComparisonDto>>
    {
        private readonly ISalesOrderRepository _salesOrderRepository;
        private readonly IPurchaseOrderRepository _purchaseOrderRepository;
        private readonly UserInfoToken _userInfoToken;

        public GetIncomeComparisonQueryHandler(ISalesOrderRepository salesOrderRepository,
            IPurchaseOrderRepository purchaseOrderRepository,
            UserInfoToken userInfoToken)
        {
            _salesOrderRepository = salesOrderRepository;
            _purchaseOrderRepository = purchaseOrderRepository;
            _userInfoToken = userInfoToken;
        }

        public async Task<List<IncomeComparisonDto>> Handle(GetIncomeComparisonQuery request, CancellationToken cancellationToken)
        {
            var locationIds = request.LocationId.HasValue
                ? new List<Guid> { request.LocationId.Value }
                : _userInfoToken.LocationIds;

            var currentYear = DateTime.Now.Year;
            var lastYear = currentYear - 1;

            var currentYearSales = await _salesOrderRepository.All.AsNoTracking()
                .Where(c => c.SOCreatedDate.Year == currentYear && locationIds.Contains(c.LocationId) && !c.IsSalesOrderRequest)
                .GroupBy(c => c.SOCreatedDate.Month)
                .Select(g => new { Month = g.Key, Total = g.Sum(c => c.TotalAmount) })
                .ToDictionaryAsync(x => x.Month, x => x.Total, cancellationToken);

            var lastYearSales = await _salesOrderRepository.All.AsNoTracking()
                .Where(c => c.SOCreatedDate.Year == lastYear && locationIds.Contains(c.LocationId) && !c.IsSalesOrderRequest)
                .GroupBy(c => c.SOCreatedDate.Month)
                .Select(g => new { Month = g.Key, Total = g.Sum(c => c.TotalAmount) })
                .ToDictionaryAsync(x => x.Month, x => x.Total, cancellationToken);

            var currentYearPurchase = await _purchaseOrderRepository.All.AsNoTracking()
                .Where(c => c.POCreatedDate.Year == currentYear && locationIds.Contains(c.LocationId) && !c.IsPurchaseOrderRequest)
                .GroupBy(c => c.POCreatedDate.Month)
                .Select(g => new { Month = g.Key, Total = g.Sum(c => c.TotalAmount) })
                .ToDictionaryAsync(x => x.Month, x => x.Total, cancellationToken);

            var lastYearPurchase = await _purchaseOrderRepository.All.AsNoTracking()
                .Where(c => c.POCreatedDate.Year == lastYear && locationIds.Contains(c.LocationId) && !c.IsPurchaseOrderRequest)
                .GroupBy(c => c.POCreatedDate.Month)
                .Select(g => new { Month = g.Key, Total = g.Sum(c => c.TotalAmount) })
                .ToDictionaryAsync(x => x.Month, x => x.Total, cancellationToken);

            var result = new List<IncomeComparisonDto>();

            for (int month = 1; month <= 12; month++)
            {
                var curSales = currentYearSales.ContainsKey(month) ? currentYearSales[month] : 0;
                var curPurchase = currentYearPurchase.ContainsKey(month) ? currentYearPurchase[month] : 0;
                var lastSales = lastYearSales.ContainsKey(month) ? lastYearSales[month] : 0;
                var lastPurchase = lastYearPurchase.ContainsKey(month) ? lastYearPurchase[month] : 0;

                result.Add(new IncomeComparisonDto
                {
                    Month = month,
                    Year = currentYear,
                    CurrentYearIncome = curSales - curPurchase,
                    LastYearIncome = lastSales - lastPurchase
                });
            }

            return result;
        }
    }
}
