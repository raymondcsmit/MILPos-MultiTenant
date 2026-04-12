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

namespace POS.MediatR.PurchaseOrder.Handlers
{
    public class GetPurchaseOrderRecentDeliveryScheduleQueryHandler
        : IRequestHandler<GetPurchaseOrderRecentDeliveryScheduleQuery, List<PurchaseOrderRecentDeliverySchedule>>
    {

        private readonly IPurchaseOrderRepository _purchaseOrderRepository;
        private readonly ILogger<GetPurchaseOrderRecentDeliveryScheduleQueryHandler> _logger;
        private readonly UserInfoToken _userInfoToken;


        public GetPurchaseOrderRecentDeliveryScheduleQueryHandler(
            IPurchaseOrderRepository purchaseOrderRepository,
            IMapper mapper,
            ILogger<GetPurchaseOrderRecentDeliveryScheduleQueryHandler> logger,
            UserInfoToken userInfoToken
          )
        {
            _purchaseOrderRepository = purchaseOrderRepository;
            _logger = logger;
            _userInfoToken = userInfoToken;

        }

        public async Task<List<PurchaseOrderRecentDeliverySchedule>> Handle(GetPurchaseOrderRecentDeliveryScheduleQuery request, CancellationToken cancellationToken)
        {
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
