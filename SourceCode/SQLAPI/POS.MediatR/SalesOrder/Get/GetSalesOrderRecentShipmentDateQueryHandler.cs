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
                .AllIncluding(c => c.Customer, cs => cs.SalesOrderItems)
                .Where(d => !d.IsSalesOrderRequest
                && d.DeliveryStatus == SalesDeliveryStatus.PENDING
                && d.SalesOrderItems.Sum(c => c.Status == PurchaseSaleItemStatusEnum.Not_Return ? c.Quantity : -1 * (c.Quantity)) > 0
                && _userInfoToken.LocationIds.Contains(d.LocationId))
                .OrderByDescending(c => c.DeliveryDate)
                         .Take(10)
                         .Select(c => new SalesOrderRecentShipmentDate
                         {
                             SalesOrderId = c.Id,
                             SalesOrderNumber = c.OrderNumber,
                             ExpectedShipmentDate = c.DeliveryDate,
                             Quantity = c.SalesOrderItems.Sum(d => d.Status == PurchaseSaleItemStatusEnum.Not_Return ? d.Quantity : -1 * (d.Quantity)),
                             CustomerId = c.CustomerId,
                             CustomerName = c.Customer.CustomerName,
                         })
                     .ToListAsync();

            return entities;
        }
    }
}
