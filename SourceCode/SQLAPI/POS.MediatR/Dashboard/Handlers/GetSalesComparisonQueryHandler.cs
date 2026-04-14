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
using POS.Common.DapperInfrastructure;
using POS.Domain;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Dapper;

namespace POS.MediatR.Dashboard.Handlers
{
    public class GetSalesComparisonQueryHandler : IRequestHandler<GetSalesComparisonQuery, List<SalesComparisonDto>>
    {
        private readonly ISalesOrderRepository _salesOrderRepository;
        private readonly UserInfoToken _userInfoToken;
        private readonly IConfiguration _configuration;
        private readonly ISqlConnectionAccessor _sqlAccessor;
        private readonly ITenantProvider _tenantProvider;
        private readonly ILogger<GetSalesComparisonQueryHandler> _logger;

        public GetSalesComparisonQueryHandler(
            ISalesOrderRepository salesOrderRepository, 
            UserInfoToken userInfoToken,
            IConfiguration configuration,
            ISqlConnectionAccessor sqlAccessor,
            ITenantProvider tenantProvider,
            ILogger<GetSalesComparisonQueryHandler> logger)
        {
            _salesOrderRepository = salesOrderRepository;
            _userInfoToken = userInfoToken;
            _configuration = configuration;
            _sqlAccessor = sqlAccessor;
            _tenantProvider = tenantProvider;
            _logger = logger;
        }

        public async Task<List<SalesComparisonDto>> Handle(GetSalesComparisonQuery request, CancellationToken cancellationToken)
        {
            var useDapper = _configuration.GetValue<bool>("Features:Dapper:GetSalesComparisonQueryHandler");
            var locationIds = request.LocationId.HasValue
                ? new List<Guid> { request.LocationId.Value }
                : _userInfoToken.LocationIds;

            var currentYear = DateTime.Now.Year;
            var lastYear = currentYear - 1;

            if (useDapper)
            {
                try
                {
                    var tenantId = _tenantProvider.GetTenantId();
                    var soTable = _sqlAccessor.GetTableName<POS.Data.SalesOrder>();

                    var currentYearStart = new DateTime(currentYear, 1, 1);
                    var currentYearEnd = new DateTime(currentYear, 12, 31, 23, 59, 59);
                    
                    var lastYearStart = new DateTime(lastYear, 1, 1);
                    var lastYearEnd = new DateTime(lastYear, 12, 31, 23, 59, 59);

                    // Note: ANSI SQL approach to extract Month is database-specific, 
                    // so we retrieve the data without grouping on the DB if it's small, 
                    // OR we use date range parameters and group locally for performance.
                    // Given the previous income-comparison logic, we will pull Date and Amount and group locally.
                    
                    var connection = _sqlAccessor.GetOpenConnection();
                    var currentTransaction = _sqlAccessor.GetCurrentTransaction();
                    var providerName = connection.GetType().Name;

                    string monthSelector = providerName switch {
                        "NpgsqlConnection" => @"EXTRACT(MONTH FROM ""SOCreatedDate"")",
                        "SqlConnection" => @"MONTH(""SOCreatedDate"")",
                        "SqliteConnection" => @"CAST(strftime('%m', ""SOCreatedDate"") AS INTEGER)",
                        _ => @"EXTRACT(MONTH FROM ""SOCreatedDate"")"
                    };
                    
                    var sql = $@"
                        SELECT {monthSelector} as ""Month"", COALESCE(SUM(""TotalAmount""), 0) as ""Total"" 
                        FROM {soTable} 
                        WHERE ""TenantId"" = @TenantId 
                          AND ""IsDeleted"" = @IsDeleted 
                          AND ""IsSalesOrderRequest"" = @IsSalesOrderRequest 
                          AND ""SOCreatedDate"" >= @StartDate 
                          AND ""SOCreatedDate"" <= @EndDate 
                          AND ""LocationId"" IN @LocationIds
                        GROUP BY {monthSelector}";

                    var currentParams = new { TenantId = tenantId, IsDeleted = false, IsSalesOrderRequest = false, StartDate = currentYearStart, EndDate = currentYearEnd, LocationIds = locationIds.ToArray() };
                    var lastParams = new { TenantId = tenantId, IsDeleted = false, IsSalesOrderRequest = false, StartDate = lastYearStart, EndDate = lastYearEnd, LocationIds = locationIds.ToArray() };

                    var currentSales = await connection.QueryAsync<MonthAggregate>(new CommandDefinition(sql, currentParams, currentTransaction, cancellationToken: cancellationToken));
                    var lastSales = await connection.QueryAsync<MonthAggregate>(new CommandDefinition(sql, lastParams, currentTransaction, cancellationToken: cancellationToken));

                    var currentYearSales = currentSales.ToDictionary(x => x.Month, x => x.Total);
                    var lastYearSales = lastSales.ToDictionary(x => x.Month, x => x.Total);

                    var dapperResult = new List<SalesComparisonDto>();
                    for (int month = 1; month <= 12; month++)
                    {
                        dapperResult.Add(new SalesComparisonDto
                        {
                            Month = month,
                            Year = currentYear,
                            CurrentYearSales = currentYearSales.ContainsKey(month) ? currentYearSales[month] : 0,
                            LastYearSales = lastYearSales.ContainsKey(month) ? lastYearSales[month] : 0
                        });
                    }

                    return dapperResult;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Dapper migration failed for GetSalesComparisonQueryHandler. Falling back to EF Core.");
                }
            }

            var currentYearSalesQuery = _salesOrderRepository.All.AsNoTracking()
                .Where(c => c.SOCreatedDate.Year == currentYear
                        && locationIds.Contains(c.LocationId)
                        && !c.IsSalesOrderRequest)
                .GroupBy(c => c.SOCreatedDate.Month)
                .Select(g => new { Month = g.Key, Total = g.Sum(c => c.TotalAmount) });

            var lastYearSalesQuery = _salesOrderRepository.All.AsNoTracking()
                .Where(c => c.SOCreatedDate.Year == lastYear
                        && locationIds.Contains(c.LocationId)
                        && !c.IsSalesOrderRequest)
                .GroupBy(c => c.SOCreatedDate.Month)
                .Select(g => new { Month = g.Key, Total = g.Sum(c => c.TotalAmount) });

            var currentYearSalesEf = await currentYearSalesQuery.ToDictionaryAsync(x => x.Month, x => x.Total, cancellationToken);
            var lastYearSalesEf = await lastYearSalesQuery.ToDictionaryAsync(x => x.Month, x => x.Total, cancellationToken);

            var result = new List<SalesComparisonDto>();

            for (int month = 1; month <= 12; month++)
            {
                result.Add(new SalesComparisonDto
                {
                    Month = month,
                    Year = currentYear,
                    CurrentYearSales = currentYearSalesEf.ContainsKey(month) ? currentYearSalesEf[month] : 0,
                    LastYearSales = lastYearSalesEf.ContainsKey(month) ? lastYearSalesEf[month] : 0
                });
            }

            return result;
        }
        
        // Helper class to map Dapper results
        private class MonthAggregate
        {
            public int Month { get; set; }
            public decimal Total { get; set; }
        }
    }
}
