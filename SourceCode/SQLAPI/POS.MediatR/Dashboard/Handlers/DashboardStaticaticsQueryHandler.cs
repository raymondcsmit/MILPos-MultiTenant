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
using POS.Common.DapperInfrastructure;
using POS.Domain;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Dapper;

namespace POS.MediatR.Handlers
{
    public class DashboardStaticaticsQueryHandler : IRequestHandler<DashboardStaticaticsQuery, DashboardStatics>
    {
        private readonly IPurchaseOrderRepository _purchaseOrderRepository;
        private readonly ISalesOrderItemRepository _salesOrderItemRepository;
        private readonly ISalesOrderRepository _salesOrderRepository;
        private readonly IPurchaseOrderItemRepository _purchaseOrderItemRepository;
        private readonly UserInfoToken _userInfoToken;
        private readonly IConfiguration _configuration;
        private readonly ISqlConnectionAccessor _sqlAccessor;
        private readonly ITenantProvider _tenantProvider;
        private readonly ILogger<DashboardStaticaticsQueryHandler> _logger;

        public DashboardStaticaticsQueryHandler(
            IPurchaseOrderRepository purchaseOrderRepository,
            ISalesOrderItemRepository salesOrderItemRepository,
            ISalesOrderRepository salesOrderRepository,
            IPurchaseOrderItemRepository purchaseOrderItemRepository,
            UserInfoToken userInfoToken,
            IConfiguration configuration,
            ISqlConnectionAccessor sqlAccessor,
            ITenantProvider tenantProvider,
            ILogger<DashboardStaticaticsQueryHandler> logger)
        {
            _purchaseOrderRepository = purchaseOrderRepository;
            _salesOrderRepository = salesOrderRepository;
            _salesOrderItemRepository = salesOrderItemRepository;
            _purchaseOrderItemRepository = purchaseOrderItemRepository;
            _userInfoToken = userInfoToken;
            _configuration = configuration;
            _sqlAccessor = sqlAccessor;
            _tenantProvider = tenantProvider;
            _logger = logger;
        }
        public async Task<DashboardStatics> Handle(DashboardStaticaticsQuery request, CancellationToken cancellationToken)
        {
            var useDapper = _configuration.GetValue<bool>("Features:Dapper:DashboardStaticaticsQueryHandler");
            var locationIds = request.LocationId.HasValue ? new List<Guid> { request.LocationId.Value } : _userInfoToken.LocationIds;
            var fromDate = request.FromDate;
            var toDate = request.ToDate.AddDays(1);
            var dashboardStatics = new DashboardStatics();

            if (useDapper)
            {
                try
                {
                    var tenantId = _tenantProvider.GetTenantId();
                    var poTable = _sqlAccessor.GetTableName<POS.Data.PurchaseOrder>();
                    var soTable = _sqlAccessor.GetTableName<POS.Data.SalesOrder>();
                    var poiTable = _sqlAccessor.GetTableName<POS.Data.PurchaseOrderItem>();
                    var soiTable = _sqlAccessor.GetTableName<POS.Data.SalesOrderItem>();

                    var returnStatusValue = (int)PurchaseSaleItemStatusEnum.Return;

                    var sql = $@"
                        SELECT COALESCE(SUM(TotalAmount), 0) FROM {poTable} WHERE TenantId = @TenantId AND IsDeleted = @IsDeleted AND IsPurchaseOrderRequest = @IsFalse AND POCreatedDate >= @FromDate AND POCreatedDate < @ToDate AND LocationId IN @LocationIds;
                        SELECT COALESCE(SUM(TotalAmount), 0) FROM {soTable} WHERE TenantId = @TenantId AND IsDeleted = @IsDeleted AND IsSalesOrderRequest = @IsFalse AND SOCreatedDate >= @FromDate AND SOCreatedDate < @ToDate AND LocationId IN @LocationIds;
                        SELECT COALESCE(SUM((soi.UnitPrice * soi.Quantity) + soi.TaxValue - soi.Discount), 0) FROM {soiTable} soi INNER JOIN {soTable} so ON soi.SalesOrderId = so.Id WHERE so.TenantId = @TenantId AND so.IsDeleted = @IsDeleted AND soi.Status = @ReturnStatus AND so.SOCreatedDate >= @FromDate AND so.SOCreatedDate < @ToDate AND so.LocationId IN @LocationIds;
                        SELECT COALESCE(SUM((poi.UnitPrice * poi.Quantity) + poi.TaxValue - poi.Discount), 0) FROM {poiTable} poi INNER JOIN {poTable} po ON poi.PurchaseOrderId = po.Id WHERE po.TenantId = @TenantId AND po.IsDeleted = @IsDeleted AND poi.Status = @ReturnStatus AND po.POCreatedDate >= @FromDate AND po.POCreatedDate < @ToDate AND po.LocationId IN @LocationIds;
                    ";

                    using var connection = _sqlAccessor.GetOpenConnection();
                    var currentTransaction = _sqlAccessor.GetCurrentTransaction();

                    var parameters = new 
                    { 
                        TenantId = tenantId, 
                        IsDeleted = false, 
                        IsFalse = false, 
                        FromDate = fromDate, 
                        ToDate = toDate, 
                        LocationIds = locationIds, 
                        ReturnStatus = returnStatusValue 
                    };

                    using var multi = await connection.QueryMultipleAsync(sql, parameters, currentTransaction, commandTimeout: 60);

                    dashboardStatics.TotalPurchase = await multi.ReadFirstAsync<decimal>();
                    dashboardStatics.TotalSales = await multi.ReadFirstAsync<decimal>();
                    dashboardStatics.TotalSalesReturn = await multi.ReadFirstAsync<decimal>();
                    dashboardStatics.TotalPurchaseReturn = await multi.ReadFirstAsync<decimal>();

                    return dashboardStatics;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Dapper migration failed for DashboardStaticaticsQueryHandler. Falling back to EF Core.");
                }
            }

            dashboardStatics.TotalPurchase = await _purchaseOrderRepository.All.AsNoTracking()
                .Where(c => !c.IsPurchaseOrderRequest && locationIds.Contains(c.LocationId) && c.POCreatedDate >= fromDate && c.POCreatedDate < toDate)
                .SumAsync(c => c.TotalAmount, cancellationToken);

            dashboardStatics.TotalSales = await _salesOrderRepository.All.AsNoTracking()
                .Where(c => !c.IsSalesOrderRequest && locationIds.Contains(c.LocationId) && c.SOCreatedDate >= fromDate && c.SOCreatedDate < toDate)
                .SumAsync(c => c.TotalAmount, cancellationToken);

            dashboardStatics.TotalSalesReturn = await _salesOrderItemRepository.AllIncluding(d => d.SalesOrder).AsNoTracking()
                .Where(c => c.Status == PurchaseSaleItemStatusEnum.Return
                        && locationIds.Contains(c.SalesOrder.LocationId)
                        && c.SalesOrder.SOCreatedDate >= fromDate
                        && c.SalesOrder.SOCreatedDate < toDate)
                .SumAsync(c => (c.UnitPrice * c.Quantity) + c.TaxValue - c.Discount, cancellationToken);

            dashboardStatics.TotalPurchaseReturn = await _purchaseOrderItemRepository.AllIncluding(c => c.PurchaseOrder).AsNoTracking()
                .Where(c => c.Status == PurchaseSaleItemStatusEnum.Return
                    && locationIds.Contains(c.PurchaseOrder.LocationId)
                        && c.PurchaseOrder.POCreatedDate >= fromDate
                        && c.PurchaseOrder.POCreatedDate < toDate)
                .SumAsync(c => (c.UnitPrice * c.Quantity) + c.TaxValue - c.Discount, cancellationToken);

            return dashboardStatics;
        }
    }
}
