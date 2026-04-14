using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Dapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using POS.Common.DapperInfrastructure;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Domain;
using POS.MediatR.Dashboard.Commands;
using POS.Repository;

namespace POS.MediatR.Dashboard.Handlers
{
    public class GetBestSellingProductCommandHandler
        : IRequestHandler<GetBestSellingProductCommand, List<BestSellingProductStatisticDto>>
    {
        private readonly ISalesOrderItemRepository _salesOrderItemRepository;
        private readonly UserInfoToken _userInfoToken;
        private readonly IConfiguration _configuration;
        private readonly ISqlConnectionAccessor _sqlAccessor;
        private readonly ITenantProvider _tenantProvider;
        private readonly ILogger<GetBestSellingProductCommandHandler> _logger;

        public GetBestSellingProductCommandHandler(
            ISalesOrderItemRepository salesOrderItemRepository,
            UserInfoToken userInfoToken,
            IConfiguration configuration,
            ISqlConnectionAccessor sqlAccessor,
            ITenantProvider tenantProvider,
            ILogger<GetBestSellingProductCommandHandler> logger)
        {
            _salesOrderItemRepository = salesOrderItemRepository;
            _userInfoToken = userInfoToken;
            _configuration = configuration;
            _sqlAccessor = sqlAccessor;
            _tenantProvider = tenantProvider;
            _logger = logger;
        }

        public async Task<List<BestSellingProductStatisticDto>> Handle(GetBestSellingProductCommand request, CancellationToken cancellationToken)
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

            var useDapper = _configuration.GetValue<bool>("Features:Dapper:GetBestSellingProductCommandHandler");

            if (useDapper)
            {
                try
                {
                    var tenantId = _tenantProvider.GetTenantId();
                    var salesOrderTable = _sqlAccessor.GetTableName<POS.Data.SalesOrder>();
                    var salesOrderItemTable = _sqlAccessor.GetTableName<POS.Data.SalesOrderItem>();
                    var productTable = _sqlAccessor.GetTableName<POS.Data.Product>();

                    // 1 = Not_Return, 0 = Return (assuming PurchaseSaleItemStatusEnum values)
                    var returnStatusValue = (int)PurchaseSaleItemStatusEnum.Return;

                    var connection = _sqlAccessor.GetOpenConnection();
                    var currentTransaction = _sqlAccessor.GetCurrentTransaction();
                    var providerName = connection.GetType().Name;

                    string limitClause = providerName == "SqlConnection" 
                        ? @"OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY" 
                        : @"LIMIT 10";

                    var sql = $@"
                        SELECT 
                            p.""Name"", 
                            SUM(CASE WHEN soi.""Status"" = @ReturnStatus THEN -soi.""Quantity"" ELSE soi.""Quantity"" END) as ""Count""
                        FROM {salesOrderItemTable} soi
                        INNER JOIN {salesOrderTable} so ON soi.""SalesOrderId"" = so.""Id""
                        INNER JOIN {productTable} p ON soi.""ProductId"" = p.""Id""
                        WHERE so.""TenantId"" = @TenantId 
                          AND so.""IsDeleted"" = @IsDeleted
                          AND so.""SOCreatedDate"" >= @FromDate 
                          AND so.""SOCreatedDate"" < @ToDate 
                          AND so.""LocationId"" IN @LocationIds
                        GROUP BY p.""Id"", p.""Name""
                        ORDER BY ""Count"" DESC
                        {limitClause}";

                    var parameters = new 
                    { 
                        TenantId = tenantId, 
                        IsDeleted = false,
                        FromDate = fromDate, 
                        ToDate = toDate, 
                        LocationIds = locationIds,
                        ReturnStatus = returnStatusValue
                    };

                    var command = new CommandDefinition(sql, parameters, currentTransaction, commandTimeout: 60, cancellationToken: cancellationToken);
                    var result = await connection.QueryAsync<BestSellingProductStatisticDto>(command);

                    return result.ToList();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Dapper migration failed for GetBestSellingProductCommandHandler. Falling back to EF Core.");
                    // Fallback to EF Core if Dapper fails
                }
            }

            // Fallback to Legacy EF Core
            var bestSellingProductStatistics = await _salesOrderItemRepository.AllIncluding(c => c.SalesOrder, cs => cs.Product)
                .Where(c => c.SalesOrder.SOCreatedDate >= fromDate
                        && c.SalesOrder.SOCreatedDate < toDate
                        && locationIds.Contains(c.SalesOrder.LocationId))
                .GroupBy(c => c.ProductId)
                .Select(cs => new BestSellingProductStatisticDto
                {
                    Name = cs.FirstOrDefault().Product.Name,
                    Count = cs.Sum(item => item.Status == PurchaseSaleItemStatusEnum.Return ? (-1) * item.Quantity : item.Quantity)
                })
                .OrderByDescending(c => c.Count)
                .Take(10)
                .ToListAsync(cancellationToken);
            return bestSellingProductStatistics;
        }
    }
}
