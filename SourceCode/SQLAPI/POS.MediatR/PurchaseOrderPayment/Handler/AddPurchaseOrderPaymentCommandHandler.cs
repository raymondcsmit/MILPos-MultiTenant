using AutoMapper;
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
using POS.MediatR.PurchaseOrderPayment.Command;
using POS.Repository;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.PurchaseOrderPayment.Handler
{
    public class AddPurchaseOrderPaymentCommandHandler : IRequestHandler<AddPurchaseOrderPaymentCommand, ServiceResponse<PurchaseOrderPaymentDto>>
    {
        private readonly IPurchaseOrderRepository _purchaseOrderRepository;
        private readonly IPurchaseOrderPaymentRepository _purchaseOrderPaymentRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly IMapper _mapper;
        private readonly ILogger<AddPurchaseOrderPaymentCommandHandler> _logger;
        private readonly IPaymentService _paymentService;

        public AddPurchaseOrderPaymentCommandHandler(
            IPurchaseOrderRepository purchaseOrderRepository,
            IUnitOfWork<POSDbContext> uow,
            IMapper mapper,
            ILogger<AddPurchaseOrderPaymentCommandHandler> logger,
            IPurchaseOrderPaymentRepository purchaseOrderPaymentRepository,
            IPaymentService paymentService)
        {
            _purchaseOrderRepository = purchaseOrderRepository;
            _uow = uow;
            _mapper = mapper;
            _logger = logger;
            _purchaseOrderPaymentRepository = purchaseOrderPaymentRepository;
            _paymentService = paymentService;
        }

        public async Task<ServiceResponse<PurchaseOrderPaymentDto>> Handle(AddPurchaseOrderPaymentCommand request, CancellationToken cancellationToken)
        {
            var purchaseOrder = await _purchaseOrderRepository.All.FirstOrDefaultAsync(c => c.Id == request.PurchaseOrderId);
            if (purchaseOrder == null)
            {
                return ServiceResponse<PurchaseOrderPaymentDto>.Return404("Purchase Order not found.");
            }
            if (request.Amount > purchaseOrder.TotalAmount)
            {
                return ServiceResponse<PurchaseOrderPaymentDto>.Return409($"Payment amount ({request.Amount:C}) cannot exceed balance amount ({purchaseOrder.TotalAmount:C})");
            }
            var purchaseOrderPayment = _mapper.Map<POS.Data.PurchaseOrderPayment>(request);
            _purchaseOrderPaymentRepository.Add(purchaseOrderPayment);

            if (purchaseOrder.TotalAmount <= (purchaseOrderPayment.Amount + purchaseOrder.TotalPaidAmount))
            {
                purchaseOrder.PaymentStatus = PaymentStatus.Paid;
            }
            else
            {
                purchaseOrder.PaymentStatus = PaymentStatus.Partial;
            }
            purchaseOrder.TotalPaidAmount += purchaseOrderPayment.Amount;
            _purchaseOrderRepository.Update(purchaseOrder);
            if (await _uow.SaveAsync() <= 0)
            {
                _logger.LogError("Error while creating Purchase Order Payment.");
                return ServiceResponse<PurchaseOrderPaymentDto>.Return500();
            }
            try
            {
                var paymentDto = new PaymentDto
                {
                    BranchId = purchaseOrder.LocationId,
                    Amount = request.Amount,
                    Notes = purchaseOrder.Note,
                    OrderNumber = purchaseOrder.OrderNumber,
                    PaymentDate = DateTime.UtcNow,
                    PaymentMethod = request.PaymentMethod,
                    ReferenceNumber = purchaseOrder.OrderNumber,
                    TransactionType = TransactionType.Purchase,
                };
                await _paymentService.ProcessPaymentAsync(paymentDto);
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while saving the purchase order payment accounting.");
            }
            var dto = _mapper.Map<PurchaseOrderPaymentDto>(purchaseOrderPayment);
            return ServiceResponse<PurchaseOrderPaymentDto>.ReturnResultWith201(dto);
        }
    }
}
