using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Data;
using POS.Data.Dto.SalesOrder;
using POS.Helper;
using POS.Repository;

namespace POS.MediatR.SalesOrder.Report
{
    public class GetCustomerPendingSalesOrderCommandHandler(
        ISalesOrderRepository _salesOrderRepository,
        ILogger<GetCustomerPendingSalesOrderCommandHandler> _logger) : IRequestHandler<GetCustomerPendingSalesOrderCommand, ServiceResponse<List<CustomerPendingSalesOrderDto>>>
    {
        public async Task<ServiceResponse<List<CustomerPendingSalesOrderDto>>> Handle(GetCustomerPendingSalesOrderCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var salesOrders = await _salesOrderRepository.All
                    .Where(c => c.CustomerId == request.CustomerId && (c.PaymentStatus == PaymentStatus.Pending || c.PaymentStatus == PaymentStatus.Partial) && !c.IsSalesOrderRequest)
                    .Select(c => new CustomerPendingSalesOrderDto
                    {
                        Id = c.Id,
                        OrderNumber = c.OrderNumber,
                        PaymentStatus = c.PaymentStatus,
                        SOCreatedDate = c.SOCreatedDate,
                        TotalAmount = c.TotalAmount,
                        TotalDiscount = c.TotalDiscount,
                        TotalPaidAmount = c.TotalPaidAmount,
                        RemainingAmount = c.TotalAmount - c.TotalPaidAmount,
                        TotalTax = c.TotalTax

                    }).ToListAsync();

                return ServiceResponse<List<CustomerPendingSalesOrderDto>>.ReturnResultWith200(salesOrders);
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while getting Partial and Pending SalesOrder");
                return ServiceResponse<List<CustomerPendingSalesOrderDto>>.Return500();
            }
        }
    }
}
