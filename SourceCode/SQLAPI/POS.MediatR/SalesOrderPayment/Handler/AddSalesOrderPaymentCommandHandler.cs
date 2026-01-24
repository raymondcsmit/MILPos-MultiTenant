using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Domain;
using POS.Helper;
using POS.MediatR.Accouting.Services;
using POS.MediatR.SalesOrderPayment.Command;
using POS.Repository;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.SalesOrderPayment.Handler
{
    public class AddSalesOrderPaymentCommandHandler : IRequestHandler<AddSalesOrderPaymentCommand, ServiceResponse<SalesOrderPaymentDto>>
    {
        private readonly ISalesOrderRepository _salesOrderRepository;
        private readonly ISalesOrderPaymentRepository _salesOrderPaymentRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly IMapper _mapper;
        private readonly ILogger<AddSalesOrderPaymentCommandHandler> _logger;
        private readonly IPaymentService _paymentService;

        public AddSalesOrderPaymentCommandHandler(
            ISalesOrderRepository salesOrderRepository,
            IUnitOfWork<POSDbContext> uow,
            IMapper mapper,
            ILogger<AddSalesOrderPaymentCommandHandler> logger,
            ISalesOrderPaymentRepository salesOrderPaymentRepository,
            IPaymentService paymentService)
        {
            _salesOrderRepository = salesOrderRepository;
            _uow = uow;
            _mapper = mapper;
            _logger = logger;
            _salesOrderPaymentRepository = salesOrderPaymentRepository;
            _paymentService = paymentService;
        }


        public async Task<ServiceResponse<SalesOrderPaymentDto>> Handle(AddSalesOrderPaymentCommand request, CancellationToken cancellationToken)
        {

            var salesOrder = await _salesOrderRepository.All.FirstOrDefaultAsync(c => c.Id == request.SalesOrderId);
            if (salesOrder == null)
            {
                return ServiceResponse<SalesOrderPaymentDto>.Return404("Sales Order not found.");
            }
            if (request.Amount > salesOrder.TotalAmount)
            {
                return ServiceResponse<SalesOrderPaymentDto>.Return409($"Payment amount ({request.Amount:C}) cannot exceed balance amount ({salesOrder.TotalAmount:C})");
            }
            var salesOrderPayment = _mapper.Map<POS.Data.SalesOrderPayment>(request);
            _salesOrderPaymentRepository.Add(salesOrderPayment);

            if (salesOrder.TotalAmount <= (salesOrderPayment.Amount + salesOrder.TotalPaidAmount))
            {
                salesOrder.PaymentStatus = PaymentStatus.Paid;
            }
            else
            {
                salesOrder.PaymentStatus = PaymentStatus.Partial;
            }
            salesOrder.TotalPaidAmount += salesOrderPayment.Amount;
            _salesOrderRepository.Update(salesOrder);
            if (await _uow.SaveAsync() <= 0)
            {
                _logger.LogError("Error while creating sales Order Payment.");
                return ServiceResponse<SalesOrderPaymentDto>.Return500();
            }
            try
            {
                var paymentDto = new PaymentDto
                {
                    Amount = request.Amount,
                    BranchId = salesOrder.LocationId,
                    Notes = salesOrder.Note,
                    OrderNumber = salesOrder.OrderNumber,
                    PaymentDate = DateTime.UtcNow,
                    PaymentMethod = request.PaymentMethod,
                    ReferenceNumber = request.ReferenceNumber,
                    TransactionType = Data.Entities.Accounts.TransactionType.Sale
                };
                await _paymentService.ProcessPaymentAsync(paymentDto);
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while saving the sales order payment accounting.");
            }

            var dto = _mapper.Map<SalesOrderPaymentDto>(salesOrderPayment);
            return ServiceResponse<SalesOrderPaymentDto>.ReturnResultWith201(dto);

        }
    }
}
