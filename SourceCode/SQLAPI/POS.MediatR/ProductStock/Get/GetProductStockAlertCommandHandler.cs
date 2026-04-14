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
using SqlKata;
using SqlKata.Compilers;

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
        private readonly Compiler _compiler;

        public GetProductStockAlertCommandHandler(
            IProductStockRepository productStockRepository,
            IConfiguration configuration,
            ISqlConnectionAccessor sqlAccessor,
            ITenantProvider tenantProvider,
            UserInfoToken userInfoToken,
            ILogger<GetProductStockAlertCommandHandler> logger,
            Compiler compiler)
        {
            _productStockRepository = productStockRepository;
            _configuration = configuration;
            _sqlAccessor = sqlAccessor;
            _tenantProvider = tenantProvider;
            _userInfoToken = userInfoToken;
            _logger = logger;
            _compiler = compiler;
        }

        public async Task<ProductStockAlertList> Handle(GetProductStockAlertCommand request, CancellationToken cancellationToken)
        {
            var useDapper = _configuration.GetValue<bool>("Features:Dapper:GetProductStockAlertCommandHandler", true);
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

                    var query = new Query($"{productStockTable} AS ps")
                        .Join($"{productTable} AS p", "ps.ProductId", "p.Id")
                        .Join($"{locationTable} AS l", "ps.LocationId", "l.Id")
                        .LeftJoin($"{unitTable} AS u", "p.UnitId", "u.Id")
                        .Where("ps.TenantId", tenantId)
                        .Where("p.IsDeleted", false)
                        .Where("ps.IsDeleted", false)
                        .WhereNotNull("p.AlertQuantity")
                        .WhereRaw("ps.\"CurrentStock\" <= p.\"AlertQuantity\"");

                    if (resource.LocationId.HasValue)
                    {
                        query.Where("ps.LocationId", resource.LocationId.Value);
                    }
                    else
                    {
                        var locationIds = _userInfoToken.LocationIds ?? new List<Guid>();
                        query.WhereIn("ps.LocationId", locationIds.ToArray());
                    }

                    if (!string.IsNullOrWhiteSpace(resource.ProductName))
                    {
                        query.WhereRaw(@"LOWER(p.""Name"") LIKE ?", $"{resource.ProductName.Trim().ToLowerInvariant()}%");
                    }

                    var countQuery = query.Clone().AsCount();

                    var dataQuery = query.Clone()
                        .Select("ps.ProductId", "p.Name AS ProductName", "ps.CurrentStock AS Stock", "l.Name AS BusinessLocation", "u.Name AS Unit")
                        .Limit(resource.PageSize)
                        .Offset(resource.Skip);

                    if (!string.IsNullOrWhiteSpace(resource.OrderBy))
                    {
                        var sort = resource.OrderBy.ToLower();
                        if (sort.Contains("stock")) { if (sort.EndsWith("desc")) dataQuery.OrderByDesc("ps.CurrentStock"); else dataQuery.OrderBy("ps.CurrentStock"); }
                        else if (sort.Contains("productname")) { if (sort.EndsWith("desc")) dataQuery.OrderByDesc("p.Name"); else dataQuery.OrderBy("p.Name"); }
                        else dataQuery.OrderBy("p.Name");
                    }
                    else
                    {
                        dataQuery.OrderBy("p.Name");
                    }

                    var connection = _sqlAccessor.GetOpenConnection();
                    var currentTransaction = _sqlAccessor.GetCurrentTransaction();

                    var compiledCount = _compiler.Compile(countQuery);
                    var compiledData = _compiler.Compile(dataQuery);

                    var totalCount = await connection.ExecuteScalarAsync<int>(compiledCount.Sql, compiledCount.NamedBindings, currentTransaction);
                    var items = (await connection.QueryAsync<ProductStockAlertDto>(compiledData.Sql, compiledData.NamedBindings, currentTransaction)).ToList();

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
