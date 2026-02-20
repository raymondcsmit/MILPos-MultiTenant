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
    public class GetSalesComparisonQueryHandler : IRequestHandler<GetSalesComparisonQuery, List<SalesComparisonDto>>
    {
        private readonly ISalesOrderRepository _salesOrderRepository;
        private readonly UserInfoToken _userInfoToken;

        public GetSalesComparisonQueryHandler(ISalesOrderRepository salesOrderRepository, UserInfoToken userInfoToken)
        {
            _salesOrderRepository = salesOrderRepository;
            _userInfoToken = userInfoToken;
        }

        public async Task<List<SalesComparisonDto>> Handle(GetSalesComparisonQuery request, CancellationToken cancellationToken)
        {
            var locationIds = request.LocationId.HasValue
                ? new List<Guid> { request.LocationId.Value }
                : _userInfoToken.LocationIds;

            var currentYear = DateTime.Now.Year;
            var lastYear = currentYear - 1;

            async Task<Dictionary<int, decimal>> GetMonthlySales(int year)
            {
                return await _salesOrderRepository.All
                    .Where(c => c.SOCreatedDate.Year == year
                            && locationIds.Contains(c.LocationId)
                            && !c.IsSalesOrderRequest)
                    .GroupBy(c => c.SOCreatedDate.Month)
                    .Select(g => new { Month = g.Key, Total = g.Sum(c => c.TotalAmount) })
                    .ToDictionaryAsync(x => x.Month, x => x.Total, cancellationToken);
            }

            var currentYearSales = await GetMonthlySales(currentYear);
            var lastYearSales = await GetMonthlySales(lastYear);

            var result = new List<SalesComparisonDto>();

            for (int month = 1; month <= 12; month++)
            {
                result.Add(new SalesComparisonDto
                {
                    Month = month,
                    Year = currentYear,
                    CurrentYearSales = currentYearSales.ContainsKey(month) ? currentYearSales[month] : 0,
                    LastYearSales = lastYearSales.ContainsKey(month) ? lastYearSales[month] : 0
                });
            }

            return result;
        }
    }
}
