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
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Domain;
using POS.MediatR.SalesOrder.Commands;
using POS.Repository;
using SqlKata;
using SqlKata.Compilers;

namespace POS.MediatR.SalesOrder.Handlers
{
    public class GetSalesOrderRecentShipmentDateQueryHandler
        : IRequestHandler<GetSalesOrderRecentShipmentDateQuery, List<SalesOrderRecentShipmentDate>>
    {
        private readonly ISalesOrderRepository _salesOrderRepository;
        private readonly UserInfoToken _userInfoToken;
        private readonly IConfiguration _configuration;
        private readonly ISqlConnectionAccessor _sqlAccessor;
        private readonly ITenantProvider _tenantProvider;
        private readonly ILogger<GetSalesOrderRecentShipmentDateQueryHandler> _logger;
        private readonly Compiler _compiler;

        public GetSalesOrderRecentShipmentDateQueryHandler(
            ISalesOrderRepository salesOrderRepository,
            UserInfoToken userInfoToken,
            IConfiguration configuration,
            ISqlConnectionAccessor sqlAccessor,
            ITenantProvider tenantProvider,
            ILogger<GetSalesOrderRecentShipmentDateQueryHandler> logger,
            Compiler compiler)
        {
            _salesOrderRepository = salesOrderRepository;
            _userInfoToken = userInfoToken;
            _configuration = configuration;
            _sqlAccessor = sqlAccessor;
            _tenantProvider = tenantProvider;
            _logger = logger;
            _compiler = compiler;
        }

        public async Task<List<SalesOrderRecentShipmentDate>> Handle(GetSalesOrderRecentShipmentDateQuery request, CancellationToken cancellationToken)
        {
            var useDapper = _configuration.GetValue<bool>("Features:Dapper:GetSalesOrderRecentShipmentDateQueryHandler", true);

            if (useDapper)
            {
                try
                {
                    var tenantId = _tenantProvider.GetTenantId();
                    var salesOrderTable = _sqlAccessor.GetTableName<POS.Data.SalesOrder>();
                    var salesOrderItemTable = _sqlAccessor.GetTableName<POS.Data.SalesOrderItem>();
                    var customerTable = _sqlAccessor.GetTableName<POS.Data.Customer>();

                    // 1 = Not_Return, 0 = Return
                    var notReturnStatus = (int)PurchaseSaleItemStatusEnum.Not_Return;
                    var pendingStatus = (int)SalesDeliveryStatus.PENDING;

                    var query = new Query($"{salesOrderTable} AS so")
                        .Select("so.Id AS SalesOrderId", "so.OrderNumber AS SalesOrderNumber", "so.DeliveryDate AS ExpectedShipmentDate", "so.CustomerId", "c.CustomerName")
                        .SelectRaw("SUM(CASE WHEN soi.\"Status\" = ? THEN soi.\"Quantity\" ELSE -soi.\"Quantity\" END) AS \"Quantity\"", notReturnStatus)
                        .Join($"{customerTable} AS c", "so.CustomerId", "c.Id")
                        .Join($"{salesOrderItemTable} AS soi", "so.Id", "soi.SalesOrderId")
                        .Where("so.TenantId", tenantId)
                        .Where("so.IsDeleted", false)
                        .Where("so.IsSalesOrderRequest", false)
                        .Where("so.DeliveryStatus", pendingStatus)
                        .WhereIn("so.LocationId", _userInfoToken.LocationIds ?? new List<Guid>())
                        .GroupBy("so.Id", "so.OrderNumber", "so.DeliveryDate", "so.CustomerId", "c.CustomerName")
                        .HavingRaw("SUM(CASE WHEN soi.\"Status\" = ? THEN soi.\"Quantity\" ELSE -soi.\"Quantity\" END) > 0", notReturnStatus)
                        .OrderByDesc("so.DeliveryDate")
                        .Limit(10);

                    var compiled = _compiler.Compile(query);
                    var connection = _sqlAccessor.GetOpenConnection();
                    var currentTransaction = _sqlAccessor.GetCurrentTransaction();

                    var result = await connection.QueryAsync<SalesOrderRecentShipmentDate>(
                        compiled.Sql, 
                        compiled.NamedBindings, 
                        currentTransaction, 
                        commandTimeout: 60);

                    return result.ToList();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Dapper migration failed for GetSalesOrderRecentShipmentDateQueryHandler. Falling back to EF Core.");
                    // Fallback to EF Core if Dapper fails
                }
            }

            // Fallback to Legacy EF Core
            var entities = await _salesOrderRepository
                .All.AsNoTracking()
                .Include(c => c.Customer)
                .Where(d => !d.IsSalesOrderRequest
                    && d.DeliveryStatus == SalesDeliveryStatus.PENDING
                    && _userInfoToken.LocationIds.Contains(d.LocationId))
                .Select(d => new 
                {
                    Order = d,
                    CustomerName = d.Customer.CustomerName,
                    TotalQuantity = d.SalesOrderItems.Sum(c => c.Status == PurchaseSaleItemStatusEnum.Not_Return ? c.Quantity : -c.Quantity)
                })
                .Where(x => x.TotalQuantity > 0)
                .OrderByDescending(x => x.Order.DeliveryDate)
                .Take(10)
                .Select(x => new SalesOrderRecentShipmentDate
                {
                    SalesOrderId = x.Order.Id,
                    SalesOrderNumber = x.Order.OrderNumber,
                    ExpectedShipmentDate = x.Order.DeliveryDate,
                    Quantity = x.TotalQuantity,
                    CustomerId = x.Order.CustomerId,
                    CustomerName = x.CustomerName
                })
                .ToListAsync(cancellationToken);

            return entities;
        }
    }
}
