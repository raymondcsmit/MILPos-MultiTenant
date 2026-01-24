using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities.Accounts;
using POS.Domain;
using POS.Helper;
using POS.MediatR.Accouting.Services;
using POS.MediatR.SalesOrderPayment.Command;
using POS.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.SalesOrderPayment.Handler
{
    public class DeleteSalesOrderPaymentCommandHandler : IRequestHandler<DeleteSalesOrderPaymentCommand, ServiceResponse<bool>>
    {
        private readonly ISalesOrderPaymentRepository _salesOrderPaymentRepository;
        private readonly ISalesOrderRepository _salesOrderRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly ILogger<DeleteSalesOrderPaymentCommandHandler> _logger;
        private readonly IPaymentService _paymentService;

        public DeleteSalesOrderPaymentCommandHandler(
            IUnitOfWork<POSDbContext> uow,
            ILogger<DeleteSalesOrderPaymentCommandHandler> logger,
            ISalesOrderPaymentRepository salesOrderPaymentRepository,
            ISalesOrderRepository salesOrderRepository,
            IPaymentService paymentService)
        {
            _uow = uow;
            _logger = logger;
            _salesOrderPaymentRepository = salesOrderPaymentRepository;
            _salesOrderRepository = salesOrderRepository;
            _paymentService = paymentService;
        }

        public async Task<ServiceResponse<bool>> Handle(DeleteSalesOrderPaymentCommand request, CancellationToken cancellationToken)
        {
            var salesOrderPayment = await _salesOrderPaymentRepository.FindAsync(request.Id);
            if (salesOrderPayment == null)
            {
                return ServiceResponse<bool>.Return404("Sales Order payment not found.");
            }

            var salesOrder = await _salesOrderRepository.All.FirstOrDefaultAsync(c => c.Id == salesOrderPayment.SalesOrderId);
            if (salesOrder.Status == SalesOrderStatus.Return)
            {
                return ServiceResponse<bool>.Return409("return Sale Order Payment Can't Delete");
            }
            _salesOrderPaymentRepository.Delete(salesOrderPayment);

            decimal refundAmount = Math.Min(salesOrder.TotalPaidAmount, salesOrderPayment.Amount);
            salesOrder.TotalPaidAmount = salesOrder.TotalPaidAmount - salesOrderPayment.Amount;

            if (salesOrder.TotalPaidAmount == 0)
            {
                salesOrder.PaymentStatus = PaymentStatus.Pending;
            }
            else if (salesOrder.TotalAmount <= salesOrder.TotalPaidAmount - salesOrderPayment.Amount)
            {
                salesOrder.PaymentStatus = PaymentStatus.Paid;
            }
            else
            {
                salesOrder.PaymentStatus = PaymentStatus.Partial;
            }

            _salesOrderRepository.Update(salesOrder);
            if (await _uow.SaveAsync() <= 0)
            {
                _logger.LogError("Error while deleting Purchase Order Payment.");
                return ServiceResponse<bool>.Return500();
            }
            // Refund accounting
            try
            {
                var paymentDto = new PaymentDto
                {
                    BranchId = salesOrder.LocationId,
                    Amount = salesOrderPayment.Amount,
                    Notes = "",
                    OrderNumber = salesOrder.OrderNumber,
                    PaymentDate = DateTime.UtcNow,
                    PaymentMethod = salesOrderPayment.PaymentMethod,
                    ReferenceNumber = salesOrder.OrderNumber,
                    TransactionType = TransactionType.SaleReturn,
                };
                await _paymentService.ProcessPaymentAsync(paymentDto);
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while saving the purchase order payment Refund Accounting.");
            }
            return ServiceResponse<bool>.ReturnSuccess();
        }
    }
}
