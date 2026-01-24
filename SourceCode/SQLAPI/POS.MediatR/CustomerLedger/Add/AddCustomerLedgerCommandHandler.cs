using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Domain;
using POS.Helper;
using POS.MediatR.SalesOrderPayment.Command;
using POS.Repository;

namespace POS.MediatR
{
    public class AddCustomerLedgerCommandHandler(
        IMediator _mediator,
        ISalesOrderRepository salesOrderRepository,
        ICustomerLedgerRepository customerLedgerRepository,
        IUnitOfWork<POSDbContext> _uow,
        IMapper mapper,
        ILogger<AddCustomerLedgerCommandHandler> _logger
    ) : IRequestHandler<AddCustomerLedgerCommand, ServiceResponse<CustomerLedgerDto>>
    {
        public async Task<ServiceResponse<CustomerLedgerDto>> Handle(AddCustomerLedgerCommand request, CancellationToken cancellationToken)
        {
            try
            {
                if(request.Amount > request.Overdue)
                {
                    return ServiceResponse<CustomerLedgerDto>.Return409("Amount cannot exceed overdue");
                }
                var entity = mapper.Map<CustomerLedger>(request);
                entity.Id = Guid.NewGuid();
                var paymentDetails = new List<string>();

                // get all open sales orders
                var salesOrders = await salesOrderRepository.All
                   .Where(s => s.CustomerId == request.CustomerId &&
                               (s.PaymentStatus == PaymentStatus.Pending || s.PaymentStatus == PaymentStatus.Partial))
                   .OrderBy(s => s.CreatedDate)
                   .ToListAsync(cancellationToken);

                // get last known balance
                var lastLedger = await customerLedgerRepository.All
                    .Where(c => c.CustomerId == request.CustomerId)
                    .OrderByDescending(c => c.ModifiedDate)
                    .FirstOrDefaultAsync(cancellationToken);

                decimal previousBalance = lastLedger?.Balance ?? 0;

                // total available = previous balance + new payment
                decimal totalAvailable = previousBalance + request.Amount;
                decimal remainingAmount = totalAvailable;

                // apply payment to sales orders (overdue)
                foreach (var order in salesOrders)
                {
                    decimal remainingToPay = order.TotalAmount - order.TotalPaidAmount;
                    if (remainingToPay <= 0)
                        continue;

                    decimal payAmount = Math.Min(remainingAmount, remainingToPay);

                    if (payAmount > 0)
                    {
                        var addSalesOrderPaymentCommand = new AddSalesOrderPaymentCommand
                        {
                            PaymentDate = request.Date,
                            SalesOrderId = order.Id,
                            Amount = payAmount,
                            PaymentMethod = ACCPaymentMethod.Cash,
                            Note = "Payment from account"
                        };

                        var result = await _mediator.Send(addSalesOrderPaymentCommand, cancellationToken);
                        paymentDetails.Add($"{order.OrderNumber} ({payAmount})");

                        remainingAmount -= payAmount;
                    }

                    if (remainingAmount <= 0)
                        break;
                }

                // whatever remains after applying to orders becomes new balance
                entity.Balance = remainingAmount;

                // add note
                var paymentSummary = paymentDetails.Count > 0
                    ? $" | Applied to Orders: {string.Join(", ", paymentDetails)}"
                    : string.Empty;

                entity.Note = $"{request.Note?.Trim()} {paymentSummary}".Trim();

                customerLedgerRepository.Add(entity);

                if (await _uow.SaveAsync() <= 0)
                {
                    return ServiceResponse<CustomerLedgerDto>.Return500();
                }

                var entityDto = mapper.Map<CustomerLedgerDto>(entity);
                return ServiceResponse<CustomerLedgerDto>.ReturnResultWith200(entityDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "error while saving Customerledger");
                return ServiceResponse<CustomerLedgerDto>.Return500("error while saving Customerledger");
            }
        }
    }
}
