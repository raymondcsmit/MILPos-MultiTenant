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
                    .AllIncluding(c => c.Supplier, c => c.PurchaseOrderItems)
                    .Where(d => !d.IsPurchaseOrderRequest
                        && d.DeliveryStatus == Data.PurchaseDeliveryStatus.PENDING
                        && _userInfoToken.LocationIds.Contains(d.LocationId)
                        && d.PurchaseOrderItems.Sum(c => c.Status == PurchaseSaleItemStatusEnum.Not_Return ? c.Quantity : -1 * (c.Quantity)) > 0)
                    .OrderByDescending(c => c.DeliveryDate)
                    .Take(10)
                    .Select(c => new PurchaseOrderRecentDeliverySchedule
                    {
                        PurchaseOrderId = c.Id,
                        PurchaseOrderNumber = c.OrderNumber,
                        ExpectedDispatchDate = c.DeliveryDate,
                        SupplierName = c.Supplier.SupplierName,
                        SupplierId = c.SupplierId,
                        TotalQuantity = c.PurchaseOrderItems.Sum(d => d.Status == PurchaseSaleItemStatusEnum.Not_Return ? d.Quantity : -1 * (d.Quantity)),
                    }).ToListAsync();

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
