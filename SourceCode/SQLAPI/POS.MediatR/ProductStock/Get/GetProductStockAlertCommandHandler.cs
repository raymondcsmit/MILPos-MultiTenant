using Dapper;
using MediatR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using POS.Common.DapperInfrastructure;
using POS.Data.Dto;
using POS.Domain;
using POS.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR
{
    public class GetProductStockAlertCommandHandler : IRequestHandler<GetProductStockAlertCommand, ProductStockAlertList>
    {
        private readonly IProductStockRepository _productStockRepository;
        private readonly IConfiguration _configuration;
        private readonly ISqlConnectionAccessor _sqlAccessor;
        private readonly ITenantProvider _tenantProvider;
        private readonly UserInfoToken _userInfoToken;
        private readonly ILogger<GetProductStockAlertCommandHandler> _logger;

        public GetProductStockAlertCommandHandler(
            IProductStockRepository productStockRepository,
            IConfiguration configuration,
            ISqlConnectionAccessor sqlAccessor,
            ITenantProvider tenantProvider,
            UserInfoToken userInfoToken,
            ILogger<GetProductStockAlertCommandHandler> logger)
        {
            _productStockRepository = productStockRepository;
            _configuration = configuration;
            _sqlAccessor = sqlAccessor;
            _tenantProvider = tenantProvider;
            _userInfoToken = userInfoToken;
            _logger = logger;
        }

        public async Task<ProductStockAlertList> Handle(GetProductStockAlertCommand request, CancellationToken cancellationToken)
        {
            var useDapper = _configuration.GetValue<bool>("Features:Dapper:GetProductStockAlertCommandHandler");
            var resource = request.ProductStockAlertResource;

            if (useDapper)
            {
                try
                {
                    var tenantId = _tenantProvider.GetTenantId();
                    var productStockTable = _sqlAccessor.GetTableName<POS.Data.Entities.ProductStock>();
                    var productTable = _sqlAccessor.GetTableName<POS.Data.Product>();
                    var locationTable = _sqlAccessor.GetTableName<POS.Data.Entities.Location>();
                    var unitTable = _sqlAccessor.GetTableName<POS.Data.UnitConversation>();

                    var sqlBuilder = new StringBuilder($@"
                        FROM {productStockTable} ps
                        INNER JOIN {productTable} p ON ps.""ProductId"" = p.""Id""
                        INNER JOIN {locationTable} l ON ps.""LocationId"" = l.""Id""
                        LEFT JOIN {unitTable} u ON p.""UnitId"" = u.""Id""
                        WHERE ps.""TenantId"" = @TenantId 
                          AND p.""IsDeleted"" = false
                          AND ps.""IsDeleted"" = false
                          AND p.""AlertQuantity"" IS NOT NULL
                          AND ps.""CurrentStock"" <= p.""AlertQuantity""
                    ");

                    var parameters = new DynamicParameters();
                    parameters.Add("TenantId", tenantId);

                    if (resource.LocationId.HasValue)
                    {
                        sqlBuilder.Append(@" AND ps.""LocationId"" = @LocationId");
                        parameters.Add("LocationId", resource.LocationId.Value);
                    }
                    else
                    {
                        var locationIds = _userInfoToken.LocationIds ?? new List<Guid>();
                        sqlBuilder.Append(@" AND ps.""LocationId"" = ANY(@LocationIds)");
                        parameters.Add("LocationIds", locationIds.ToArray());
                    }

                    if (!string.IsNullOrWhiteSpace(resource.ProductName))
                    {
                        parameters.Add("ProductName", $"{resource.ProductName.Trim().ToLowerInvariant()}%");
                        sqlBuilder.Append(@" AND LOWER(p.""Name"") LIKE @ProductName");
                    }

                    var countSql = $"SELECT COUNT(*) {sqlBuilder.ToString()}";

                    var orderBy = @"ORDER BY p.""Name"" ASC";
                    if (!string.IsNullOrWhiteSpace(resource.OrderBy))
                    {
                        var sort = resource.OrderBy.ToLower();
                        if (sort.Contains("stock")) orderBy = sort.EndsWith("desc") ? @"ORDER BY ps.""CurrentStock"" DESC" : @"ORDER BY ps.""CurrentStock"" ASC";
                        else if (sort.Contains("productname")) orderBy = sort.EndsWith("desc") ? @"ORDER BY p.""Name"" DESC" : @"ORDER BY p.""Name"" ASC";
                    }

                    var dataSql = $@"
                        SELECT 
                            ps.""ProductId"", 
                            p.""Name"" AS ""ProductName"", 
                            ps.""CurrentStock"" AS ""Stock"", 
                            l.""Name"" AS ""BusinessLocation"", 
                            u.""Name"" AS ""Unit""
                        {sqlBuilder.ToString()}
                        {orderBy}
                        LIMIT @PageSize OFFSET @Skip
                    ";

                    parameters.Add("PageSize", resource.PageSize);
                    parameters.Add("Skip", resource.Skip);

                    var connection = _sqlAccessor.GetOpenConnection();
                    var currentTransaction = _sqlAccessor.GetCurrentTransaction();

                    var multiSql = $"{countSql}; {dataSql};";
                    using var multi = await connection.QueryMultipleAsync(multiSql, parameters, currentTransaction, commandTimeout: 30);

                    var totalCount = await multi.ReadFirstAsync<int>();
                    var items = (await multi.ReadAsync<ProductStockAlertDto>()).ToList();

                    return new ProductStockAlertList(items, totalCount, resource.Skip, resource.PageSize);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Dapper migration failed for GetProductStockAlertCommandHandler. Falling back to EF Core.");
                }
            }

            return await _productStockRepository.GetProductStockAlertsAsync(request.ProductStockAlertResource);
        }
    }
}
