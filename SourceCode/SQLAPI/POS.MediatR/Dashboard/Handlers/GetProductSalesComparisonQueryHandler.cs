using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto;
using POS.Data.Dto.Dashboard;
using POS.Data.Entities;
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
    public class GetProductSalesComparisonQueryHandler : IRequestHandler<GetProductSalesComparisonQuery, List<ProductSalesComparisonDto>>
    {
        private readonly ISalesOrderItemRepository _salesOrderItemRepository;
        private readonly UserInfoToken _userInfoToken;
        private readonly IConfiguration _configuration;
        private readonly ISqlConnectionAccessor _sqlAccessor;
        private readonly ITenantProvider _tenantProvider;
        private readonly ILogger<GetProductSalesComparisonQueryHandler> _logger;

        public GetProductSalesComparisonQueryHandler(
            ISalesOrderItemRepository salesOrderItemRepository, 
            UserInfoToken userInfoToken,
            IConfiguration configuration,
            ISqlConnectionAccessor sqlAccessor,
            ITenantProvider tenantProvider,
            ILogger<GetProductSalesComparisonQueryHandler> logger)
        {
            _salesOrderItemRepository = salesOrderItemRepository;
            _userInfoToken = userInfoToken;
            _configuration = configuration;
            _sqlAccessor = sqlAccessor;
            _tenantProvider = tenantProvider;
            _logger = logger;
        }

        public async Task<List<ProductSalesComparisonDto>> Handle(GetProductSalesComparisonQuery request, CancellationToken cancellationToken)
        {
            var useDapper = _configuration.GetValue<bool>("Features:Dapper:GetProductSalesComparisonQueryHandler", true);
            var locationIds = request.LocationId.HasValue 
                ? new List<Guid> { request.LocationId.Value } 
                : _userInfoToken.LocationIds ?? new List<Guid>();

            var currentYear = DateTime.Now.Year;
            var lastYear = currentYear - 1;

            var startOfCurrentYear = new DateTime(currentYear, 1, 1);
            var endOfCurrentYear = new DateTime(currentYear + 1, 1, 1);
            
            var startOfLastYear = new DateTime(lastYear, 1, 1);
            var endOfLastYear = new DateTime(lastYear + 1, 1, 1);

            if (useDapper)
            {
                try
                {
                    var tenantId = _tenantProvider.GetTenantId();
                    var connection = _sqlAccessor.GetOpenConnection();
                    var currentTransaction = _sqlAccessor.GetCurrentTransaction();
                    var providerName = connection.GetType().Name;

                    var soTable = _sqlAccessor.GetTableName<POS.Data.SalesOrder>();
                    var soiTable = _sqlAccessor.GetTableName<POS.Data.SalesOrderItem>();
                    var pTable = _sqlAccessor.GetTableName<POS.Data.Product>();

                    string limitClause = providerName == "SqlConnection" 
                        ? @"OFFSET 0 ROWS FETCH NEXT @Count ROWS ONLY"
                        : @"LIMIT @Count";

                    var currentYearSql = $@"
                        SELECT 
                            soi.""ProductId"",
                            p.""Name"" AS ""ProductName"",
                            SUM(soi.""Quantity"") AS ""Quantity"",
                            SUM((soi.""Quantity"" * soi.""UnitPrice"") - soi.""Discount"" + soi.""TaxValue"") AS ""Revenue""
                        FROM {soiTable} soi
                        INNER JOIN {soTable} so ON soi.""SalesOrderId"" = so.""Id""
                        INNER JOIN {pTable} p ON soi.""ProductId"" = p.""Id""
                        WHERE so.""TenantId"" = @TenantId
                          AND so.""IsDeleted"" = false
                          AND so.""IsSalesOrderRequest"" = false
                          AND so.""SOCreatedDate"" >= @CurrentYearStart
                          AND so.""SOCreatedDate"" < @CurrentYearEnd
                          AND so.""LocationId"" IN @LocationIds
                          AND soi.""Status"" != @ReturnStatus
                        GROUP BY soi.""ProductId"", p.""Name""
                        ORDER BY SUM(soi.""Quantity"") DESC
                        {limitClause}";

                    var currentParams = new 
                    {
                        TenantId = tenantId,
                        CurrentYearStart = startOfCurrentYear,
                        CurrentYearEnd = endOfCurrentYear,
                        LocationIds = locationIds.ToArray(),
                        ReturnStatus = PurchaseSaleItemStatusEnum.Return,
                        Count = request.Count
                    };

                    var currentYearSales = (await connection.QueryAsync<ProductSalesData>(currentYearSql, currentParams, currentTransaction, commandTimeout: 30)).ToList();

                    if (!currentYearSales.Any())
                    {
                        return new List<ProductSalesComparisonDto>();
                    }

                    var topProductIds = currentYearSales.Select(x => x.ProductId).ToArray();

                    var lastYearSql = $@"
                        SELECT 
                            soi.""ProductId"",
                            SUM(soi.""Quantity"") AS ""Quantity"",
                            SUM((soi.""Quantity"" * soi.""UnitPrice"") - soi.""Discount"" + soi.""TaxValue"") AS ""Revenue""
                        FROM {soiTable} soi
                        INNER JOIN {soTable} so ON soi.""SalesOrderId"" = so.""Id""
                        WHERE so.""TenantId"" = @TenantId
                          AND so.""IsDeleted"" = false
                          AND so.""IsSalesOrderRequest"" = false
                          AND so.""SOCreatedDate"" >= @LastYearStart
                          AND so.""SOCreatedDate"" < @LastYearEnd
                          AND so.""LocationId"" IN @LocationIds
                          AND soi.""ProductId"" IN @TopProductIds
                          AND soi.""Status"" != @ReturnStatus
                        GROUP BY soi.""ProductId""";

                    var lastParams = new 
                    {
                        TenantId = tenantId,
                        LastYearStart = startOfLastYear,
                        LastYearEnd = endOfLastYear,
                        LocationIds = locationIds.ToArray(),
                        TopProductIds = topProductIds,
                        ReturnStatus = PurchaseSaleItemStatusEnum.Return
                    };

                    var lastYearSales = (await connection.QueryAsync<ProductSalesData>(lastYearSql, lastParams, currentTransaction, commandTimeout: 30)).ToList();

                    var dapperResult = currentYearSales.Select(curr =>
                    {
                        var prev = lastYearSales.FirstOrDefault(x => x.ProductId == curr.ProductId);
                        return new ProductSalesComparisonDto
                        {
                            ProductName = curr.ProductName,
                            CurrentYearQuantity = (int)curr.Quantity,
                            LastYearQuantity = (int?)prev?.Quantity ?? 0,
                            CurrentYearRevenue = curr.Revenue,
                            LastYearRevenue = prev?.Revenue ?? 0m
                        };
                    }).ToList();

                    return dapperResult;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Dapper migration failed for GetProductSalesComparisonQueryHandler. Falling back to EF Core.");
                }
            }

            // 1. Get Top Products for Current Year
            var currentYearSalesEf = await _salesOrderItemRepository.AllIncluding(c => c.SalesOrder, cs => cs.Product).AsNoTracking()
                .Where(c => c.SalesOrder.SOCreatedDate >= startOfCurrentYear && c.SalesOrder.SOCreatedDate < endOfCurrentYear
                        && locationIds.Contains(c.SalesOrder.LocationId)
                        && c.Status != PurchaseSaleItemStatusEnum.Return)
                .GroupBy(c => new { c.ProductId, c.Product.Name })
                .Select(g => new
                {
                    ProductId = g.Key.ProductId,
                    ProductName = g.Key.Name,
                    Quantity = g.Sum(c => c.Quantity),
                    Revenue = g.Sum(c => (c.Quantity * c.UnitPrice) - c.Discount + c.TaxValue)
                })
                .OrderByDescending(x => x.Quantity)
                .Take(request.Count)
                .ToListAsync(cancellationToken);

            var topProductIdsEf = currentYearSalesEf.Select(x => x.ProductId).ToList();

            // 2. Get Statistics for these products for Last Year
            var lastYearSalesEf = await _salesOrderItemRepository.AllIncluding(c => c.SalesOrder).AsNoTracking()
                .Where(c => c.SalesOrder.SOCreatedDate >= startOfLastYear && c.SalesOrder.SOCreatedDate < endOfLastYear
                        && locationIds.Contains(c.SalesOrder.LocationId)
                        && topProductIdsEf.Contains(c.ProductId)
                        && c.Status != PurchaseSaleItemStatusEnum.Return)
                .GroupBy(c => c.ProductId)
                .Select(g => new
                {
                    ProductId = g.Key,
                    Quantity = g.Sum(c => c.Quantity),
                    Revenue = g.Sum(c => (c.Quantity * c.UnitPrice) - c.Discount + c.TaxValue)
                })
                .ToListAsync(cancellationToken);

            // 3. Combine results
            var result = currentYearSalesEf.Select(curr =>
            {
                var prev = lastYearSalesEf.FirstOrDefault(x => x.ProductId == curr.ProductId);
                return new ProductSalesComparisonDto
                {
                    ProductName = curr.ProductName,
                    CurrentYearQuantity = (int) curr.Quantity,
                    LastYearQuantity = (int?) prev?.Quantity ?? 0,
                    CurrentYearRevenue = curr.Revenue,
                    LastYearRevenue = prev?.Revenue ?? 0m
                };
            }).ToList();

            return result;
        }
        
        private class ProductSalesData
        {
            public Guid ProductId { get; set; }
            public string ProductName { get; set; }
            public decimal Quantity { get; set; }
            public decimal Revenue { get; set; }
        }
    }
}
