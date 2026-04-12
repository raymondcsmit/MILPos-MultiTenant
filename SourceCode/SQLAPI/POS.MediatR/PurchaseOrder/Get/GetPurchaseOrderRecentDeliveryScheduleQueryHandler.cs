using AutoMapper;
using POS.Data.Entities;
using POS.MediatR.CommandAndQuery;
using POS.Repository;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using POS.MediatR;
using POS.Data.Dto;
using Microsoft.AspNetCore.Components.Web;
using System;
using Dapper;
using Microsoft.Extensions.Configuration;
using POS.Common.DapperInfrastructure;
using POS.Data;
using POS.Domain;

namespace POS.MediatR.PurchaseOrder.Handlers
{
    public class GetPurchaseOrderRecentDeliveryScheduleQueryHandler
        : IRequestHandler<GetPurchaseOrderRecentDeliveryScheduleQuery, List<PurchaseOrderRecentDeliverySchedule>>
    {

        private readonly IPurchaseOrderRepository _purchaseOrderRepository;
        private readonly ILogger<GetPurchaseOrderRecentDeliveryScheduleQueryHandler> _logger;
        private readonly UserInfoToken _userInfoToken;
        private readonly IConfiguration _configuration;
        private readonly ISqlConnectionAccessor _sqlAccessor;
        private readonly ITenantProvider _tenantProvider;

        public GetPurchaseOrderRecentDeliveryScheduleQueryHandler(
            IPurchaseOrderRepository purchaseOrderRepository,
            IMapper mapper,
            ILogger<GetPurchaseOrderRecentDeliveryScheduleQueryHandler> logger,
            UserInfoToken userInfoToken,
            IConfiguration configuration,
            ISqlConnectionAccessor sqlAccessor,
            ITenantProvider tenantProvider
          )
        {
            _purchaseOrderRepository = purchaseOrderRepository;
            _logger = logger;
            _userInfoToken = userInfoToken;
            _configuration = configuration;
            _sqlAccessor = sqlAccessor;
            _tenantProvider = tenantProvider;
        }

        public async Task<List<PurchaseOrderRecentDeliverySchedule>> Handle(GetPurchaseOrderRecentDeliveryScheduleQuery request, CancellationToken cancellationToken)
        {
            var useDapper = _configuration.GetValue<bool>("Features:Dapper:GetPurchaseOrderRecentDeliveryScheduleQueryHandler");

            if (useDapper)
            {
                try
                {
                    var tenantId = _tenantProvider.GetTenantId();
                    var purchaseOrderTable = _sqlAccessor.GetTableName<POS.Data.PurchaseOrder>();
                    var purchaseOrderItemTable = _sqlAccessor.GetTableName<POS.Data.PurchaseOrderItem>();
                    var supplierTable = _sqlAccessor.GetTableName<POS.Data.Supplier>();

                    var notReturnStatus = (int)PurchaseSaleItemStatusEnum.Not_Return;
                    var pendingStatus = (int)PurchaseDeliveryStatus.PENDING;

                    var sql = $@"
                        SELECT 
                            po.Id AS PurchaseOrderId,
                            po.OrderNumber AS PurchaseOrderNumber,
                            po.DeliveryDate AS ExpectedDispatchDate,
                            po.SupplierId,
                            s.SupplierName,
                            SUM(CASE WHEN poi.Status = @NotReturnStatus THEN poi.Quantity ELSE -poi.Quantity END) AS TotalQuantity
                        FROM {purchaseOrderTable} po
                        INNER JOIN {supplierTable} s ON po.SupplierId = s.Id
                        INNER JOIN {purchaseOrderItemTable} poi ON po.Id = poi.PurchaseOrderId
                        WHERE po.TenantId = @TenantId 
                          AND po.IsDeleted = @IsDeleted
                          AND po.IsPurchaseOrderRequest = @IsPurchaseOrderRequest
                          AND po.DeliveryStatus = @PendingStatus
                          AND po.LocationId IN @LocationIds
                        GROUP BY 
                            po.Id, po.OrderNumber, po.DeliveryDate, po.SupplierId, s.SupplierName
                        HAVING SUM(CASE WHEN poi.Status = @NotReturnStatus THEN poi.Quantity ELSE -poi.Quantity END) > 0
                        ORDER BY po.DeliveryDate DESC";

                    var connection = _sqlAccessor.GetOpenConnection();
                    var currentTransaction = _sqlAccessor.GetCurrentTransaction();

                    var parameters = new 
                    { 
                        TenantId = tenantId, 
                        IsDeleted = false,
                        IsPurchaseOrderRequest = false,
                        LocationIds = _userInfoToken.LocationIds,
                        NotReturnStatus = notReturnStatus,
                        PendingStatus = pendingStatus
                    };

                    var command = new CommandDefinition(sql, parameters, currentTransaction, commandTimeout: 60, cancellationToken: cancellationToken);
                    var result = await connection.QueryAsync<PurchaseOrderRecentDeliverySchedule>(command);

                    return result.Take(10).ToList();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Dapper migration failed for GetPurchaseOrderRecentDeliveryScheduleQueryHandler. Falling back to EF Core.");
                }
            }

            try
            {
                var entities = await _purchaseOrderRepository
                    .All.AsNoTracking()
                    .Include(c => c.Supplier)
                    .Where(d => !d.IsPurchaseOrderRequest
                        && d.DeliveryStatus == Data.PurchaseDeliveryStatus.PENDING
                        && _userInfoToken.LocationIds.Contains(d.LocationId))
                    .Select(d => new
                    {
                        Order = d,
                        SupplierName = d.Supplier.SupplierName,
                        TotalQuantity = d.PurchaseOrderItems.Sum(c => c.Status == PurchaseSaleItemStatusEnum.Not_Return ? c.Quantity : -c.Quantity)
                    })
                    .Where(x => x.TotalQuantity > 0)
                    .OrderByDescending(x => x.Order.DeliveryDate)
                    .Take(10)
                    .Select(x => new PurchaseOrderRecentDeliverySchedule
                    {
                        PurchaseOrderId = x.Order.Id,
                        PurchaseOrderNumber = x.Order.OrderNumber,
                        ExpectedDispatchDate = x.Order.DeliveryDate,
                        SupplierName = x.SupplierName,
                        SupplierId = x.Order.SupplierId,
                        TotalQuantity = x.TotalQuantity,
                    }).ToListAsync(cancellationToken);

                return entities;
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while getting recent delivery");
                return [];
            }
        }
    }
}
