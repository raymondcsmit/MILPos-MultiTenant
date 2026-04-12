using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Dapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using POS.Data.Dto;
using POS.Data.Dto.Dashboard;
using POS.Domain;
using POS.MediatR.Dashboard.Commands;
using POS.Repository;
using POS.Common.DapperInfrastructure;
using POS.Data.Entities;

namespace POS.MediatR.Dashboard.Handlers
{
    public class GetIncomeComparisonQueryHandler : IRequestHandler<GetIncomeComparisonQuery, List<IncomeComparisonDto>>
    {
        private readonly ILogger<GetIncomeComparisonQueryHandler> _logger;
        private readonly ITenantProvider _tenantProvider;
        private readonly IConfiguration _configuration;
        private readonly ISqlConnectionAccessor _sqlAccessor;
        
        // Legacy EF Core Repositories
        private readonly ISalesOrderRepository _salesOrderRepository;
        private readonly IPurchaseOrderRepository _purchaseOrderRepository;
        private readonly UserInfoToken _userInfoToken;

        public GetIncomeComparisonQueryHandler(
            ILogger<GetIncomeComparisonQueryHandler> logger,
            ITenantProvider tenantProvider,
            IConfiguration configuration,
            ISqlConnectionAccessor sqlAccessor,
            ISalesOrderRepository salesOrderRepository,
            IPurchaseOrderRepository purchaseOrderRepository,
            UserInfoToken userInfoToken)
        {
            _logger = logger;
            _tenantProvider = tenantProvider;
            _configuration = configuration;
            _sqlAccessor = sqlAccessor;
            
            _salesOrderRepository = salesOrderRepository;
            _purchaseOrderRepository = purchaseOrderRepository;
            _userInfoToken = userInfoToken;
        }

        public async Task<List<IncomeComparisonDto>> Handle(GetIncomeComparisonQuery request, CancellationToken cancellationToken)
        {
            // FEATURE FLAG GATING: Fallback to EF Core if disabled or errors out
            var useDapper = _configuration.GetValue<bool>("Features:Dapper:GetIncomeComparisonQueryHandler");

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

                    var currentYearStart = new DateTime(currentYear, 1, 1);
                    var currentYearEnd = new DateTime(currentYear, 12, 31, 23, 59, 59);
                    
                    var lastYearStart = new DateTime(lastYear, 1, 1);
                    var lastYearEnd = new DateTime(lastYear, 12, 31, 23, 59, 59);

                    var salesOrderTable = _sqlAccessor.GetTableName<POS.Data.SalesOrder>();
                    var purchaseOrderTable = _sqlAccessor.GetTableName<POS.Data.PurchaseOrder>();

                    // CRITICAL: Dapper bypasses EF Core Global Query Filters. 
                    // You MUST explicitly include `TenantId = @TenantId AND IsDeleted = @IsDeleted` in your SQL!
                    var salesSql = $@"
                        SELECT SOCreatedDate as Date, TotalAmount 
                        FROM {salesOrderTable} 
                        WHERE TenantId = @TenantId 
                          AND IsDeleted = @IsDeleted 
                          AND IsSalesOrderRequest = @IsSalesOrderRequest 
                          AND SOCreatedDate >= @StartDate 
                          AND SOCreatedDate <= @EndDate 
                          AND LocationId IN @LocationIds";

                    var purchaseSql = $@"
                        SELECT POCreatedDate as Date, TotalAmount 
                        FROM {purchaseOrderTable} 
                        WHERE TenantId = @TenantId 
                          AND IsDeleted = @IsDeleted 
                          AND IsPurchaseOrderRequest = @IsPurchaseOrderRequest 
                          AND POCreatedDate >= @StartDate 
                          AND POCreatedDate <= @EndDate 
                          AND LocationId IN @LocationIds";

                    using var connection = _sqlAccessor.GetOpenConnection();
                    var currentTransaction = _sqlAccessor.GetCurrentTransaction();

                    // Current Year Sales
                    var currentYearSalesCommand = new CommandDefinition(salesSql, 
                        new { TenantId = tenantId, IsDeleted = false, IsSalesOrderRequest = false, StartDate = currentYearStart, EndDate = currentYearEnd, LocationIds = locationIds },
                        transaction: currentTransaction, commandTimeout: 60, cancellationToken: cancellationToken);
                    var currentYearSalesRaw = await connection.QueryAsync<RawOrderDto>(currentYearSalesCommand);

                    // Last Year Sales
                    var lastYearSalesCommand = new CommandDefinition(salesSql, 
                        new { TenantId = tenantId, IsDeleted = false, IsSalesOrderRequest = false, StartDate = lastYearStart, EndDate = lastYearEnd, LocationIds = locationIds },
                        transaction: currentTransaction, commandTimeout: 60, cancellationToken: cancellationToken);
                    var lastYearSalesRaw = await connection.QueryAsync<RawOrderDto>(lastYearSalesCommand);

                    // Current Year Purchase
                    var currentYearPurchaseCommand = new CommandDefinition(purchaseSql, 
                        new { TenantId = tenantId, IsDeleted = false, IsPurchaseOrderRequest = false, StartDate = currentYearStart, EndDate = currentYearEnd, LocationIds = locationIds },
                        transaction: currentTransaction, commandTimeout: 60, cancellationToken: cancellationToken);
                    var currentYearPurchaseRaw = await connection.QueryAsync<RawOrderDto>(currentYearPurchaseCommand);

                    // Last Year Purchase
                    var lastYearPurchaseCommand = new CommandDefinition(purchaseSql, 
                        new { TenantId = tenantId, IsDeleted = false, IsPurchaseOrderRequest = false, StartDate = lastYearStart, EndDate = lastYearEnd, LocationIds = locationIds },
                        transaction: currentTransaction, commandTimeout: 60, cancellationToken: cancellationToken);
                    var lastYearPurchaseRaw = await connection.QueryAsync<RawOrderDto>(lastYearPurchaseCommand);

                    var currentYearSales = currentYearSalesRaw.GroupBy(c => c.Date.Month).ToDictionary(x => x.Key, x => x.Sum(c => c.TotalAmount));
                    var lastYearSales = lastYearSalesRaw.GroupBy(c => c.Date.Month).ToDictionary(x => x.Key, x => x.Sum(c => c.TotalAmount));
                    var currentYearPurchase = currentYearPurchaseRaw.GroupBy(c => c.Date.Month).ToDictionary(x => x.Key, x => x.Sum(c => c.TotalAmount));
                    var lastYearPurchase = lastYearPurchaseRaw.GroupBy(c => c.Date.Month).ToDictionary(x => x.Key, x => x.Sum(c => c.TotalAmount));

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
                catch (Exception ex)
                {
                    // Rollback Condition: Log the Dapper failure, but gracefully fallback to EF Core for 100% Uptime
                    _logger.LogError(ex, "Dapper execution failed for GetIncomeComparisonQueryHandler. Falling back to EF Core.");
                }
            }

            #region LEGACY EF CORE IMPLEMENTATION
            
            var efCurrentYearSales = await _salesOrderRepository.All.AsNoTracking()
                .Where(c => c.SOCreatedDate.Year == currentYear && locationIds.Contains(c.LocationId) && !c.IsSalesOrderRequest)
                .GroupBy(c => c.SOCreatedDate.Month)
                .Select(g => new { Month = g.Key, Total = g.Sum(c => c.TotalAmount) })
                .ToDictionaryAsync(x => x.Month, x => x.Total, cancellationToken);

            var efLastYearSales = await _salesOrderRepository.All.AsNoTracking()
                .Where(c => c.SOCreatedDate.Year == lastYear && locationIds.Contains(c.LocationId) && !c.IsSalesOrderRequest)
                .GroupBy(c => c.SOCreatedDate.Month)
                .Select(g => new { Month = g.Key, Total = g.Sum(c => c.TotalAmount) })
                .ToDictionaryAsync(x => x.Month, x => x.Total, cancellationToken);

            var efCurrentYearPurchase = await _purchaseOrderRepository.All.AsNoTracking()
                .Where(c => c.POCreatedDate.Year == currentYear && locationIds.Contains(c.LocationId) && !c.IsPurchaseOrderRequest)
                .GroupBy(c => c.POCreatedDate.Month)
                .Select(g => new { Month = g.Key, Total = g.Sum(c => c.TotalAmount) })
                .ToDictionaryAsync(x => x.Month, x => x.Total, cancellationToken);

            var efLastYearPurchase = await _purchaseOrderRepository.All.AsNoTracking()
                .Where(c => c.POCreatedDate.Year == lastYear && locationIds.Contains(c.LocationId) && !c.IsPurchaseOrderRequest)
                .GroupBy(c => c.POCreatedDate.Month)
                .Select(g => new { Month = g.Key, Total = g.Sum(c => c.TotalAmount) })
                .ToDictionaryAsync(x => x.Month, x => x.Total, cancellationToken);

            var efResult = new List<IncomeComparisonDto>();

            for (int month = 1; month <= 12; month++)
            {
                var curSales = efCurrentYearSales.ContainsKey(month) ? efCurrentYearSales[month] : 0;
                var curPurchase = efCurrentYearPurchase.ContainsKey(month) ? efCurrentYearPurchase[month] : 0;
                var lastSales = efLastYearSales.ContainsKey(month) ? efLastYearSales[month] : 0;
                var lastPurchase = efLastYearPurchase.ContainsKey(month) ? efLastYearPurchase[month] : 0;

                efResult.Add(new IncomeComparisonDto
                {
                    Month = month,
                    Year = currentYear,
                    CurrentYearIncome = curSales - curPurchase,
                    LastYearIncome = lastSales - lastPurchase
                });
            }

            return efResult;
            
            #endregion
        }
        
        private class RawOrderDto 
        {
            public DateTime Date { get; set; }
            public decimal TotalAmount { get; set; }
        }
    }
}
