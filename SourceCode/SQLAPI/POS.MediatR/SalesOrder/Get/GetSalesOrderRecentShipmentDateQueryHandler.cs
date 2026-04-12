using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.MediatR.SalesOrder.Commands;
using POS.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.SalesOrder.Handlers
{
    public class GetSalesOrderRecentShipmentDateQueryHandler
        : IRequestHandler<GetSalesOrderRecentShipmentDateQuery, List<SalesOrderRecentShipmentDate>>
    {

        private readonly ISalesOrderRepository _salesOrderRepository;
        private readonly UserInfoToken _userInfoToken;

        public GetSalesOrderRecentShipmentDateQueryHandler(
            ISalesOrderRepository salesOrderRepository,
            UserInfoToken userInfoToken
          )
        {
            _salesOrderRepository = salesOrderRepository;
            _userInfoToken = userInfoToken;
        }

        public async Task<List<SalesOrderRecentShipmentDate>> Handle(GetSalesOrderRecentShipmentDateQuery request, CancellationToken cancellationToken)
        {
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
