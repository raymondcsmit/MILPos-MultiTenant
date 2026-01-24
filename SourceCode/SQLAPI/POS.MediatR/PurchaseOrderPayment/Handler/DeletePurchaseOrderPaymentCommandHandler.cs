using AutoMapper;
using MediatR;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities.Accounts;
using POS.Domain;
using POS.Helper;
using POS.MediatR.Accouting.Services;
using POS.MediatR.CommandAndQuery;
using POS.MediatR.PurchaseOrderPayment.Command;
using POS.Repository;
using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.PurchaseOrderPayment.Handler
{
    public class DeletePurchaseOrderPaymentCommandHandler : IRequestHandler<DeletePurchaseOrderPaymentCommand, ServiceResponse<bool>>
    {
        private readonly IPurchaseOrderPaymentRepository _purchaseOrderPaymentRepository;
        private readonly IPurchaseOrderRepository _purchaseOrderRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly ILogger<DeletePurchaseOrderPaymentCommandHandler> _logger;
        private readonly IPaymentService _paymentService;

        public DeletePurchaseOrderPaymentCommandHandler(
            IUnitOfWork<POSDbContext> uow,
            ILogger<DeletePurchaseOrderPaymentCommandHandler> logger,
            IPurchaseOrderPaymentRepository purchaseOrderPaymentRepository,
            IPurchaseOrderRepository purchaseOrderRepository,
            IPaymentService paymentService)
        {
            _uow = uow;
            _logger = logger;
            _purchaseOrderPaymentRepository = purchaseOrderPaymentRepository;
            _purchaseOrderRepository = purchaseOrderRepository;
            _paymentService = paymentService;
        }

        public async Task<ServiceResponse<bool>> Handle(DeletePurchaseOrderPaymentCommand request, CancellationToken cancellationToken)
        {
            var purchaseOrderPayment = await _purchaseOrderPaymentRepository.FindAsync(request.Id);
            if (purchaseOrderPayment == null)
            {
                return ServiceResponse<bool>.Return404("Purchase Order payment not found.");
            }

            var purchaseOrder = await _purchaseOrderRepository.All.FirstOrDefaultAsync(c => c.Id == purchaseOrderPayment.PurchaseOrderId);
            if (purchaseOrder.Status == PurchaseOrderStatus.Return)
            {
                return ServiceResponse<bool>.Return409("return Purchase Order Payment Can't Delete");
            }
            _purchaseOrderPaymentRepository.Delete(purchaseOrderPayment);
            decimal refundAmount = Math.Min(purchaseOrder.TotalPaidAmount, purchaseOrderPayment.Amount);
            purchaseOrder.TotalPaidAmount = purchaseOrder.TotalPaidAmount - purchaseOrderPayment.Amount;

            if (purchaseOrder.TotalPaidAmount == 0)
            {
                purchaseOrder.PaymentStatus = PaymentStatus.Pending;
            }
            else if (purchaseOrder.TotalAmount <= purchaseOrder.TotalPaidAmount - purchaseOrderPayment.Amount)
            {
                purchaseOrder.PaymentStatus = PaymentStatus.Paid;
            }
            else
            {
                purchaseOrder.PaymentStatus = PaymentStatus.Partial;
            }
            _purchaseOrderRepository.Update(purchaseOrder);
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
                    BranchId = purchaseOrder.LocationId,
                    Amount = purchaseOrderPayment.Amount,
                    Notes = "",
                    OrderNumber = purchaseOrder.OrderNumber,
                    PaymentDate = DateTime.UtcNow,
                    PaymentMethod = purchaseOrderPayment.PaymentMethod,
                    ReferenceNumber = purchaseOrder.OrderNumber,
                    TransactionType = TransactionType.PurchaseReturn,
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
