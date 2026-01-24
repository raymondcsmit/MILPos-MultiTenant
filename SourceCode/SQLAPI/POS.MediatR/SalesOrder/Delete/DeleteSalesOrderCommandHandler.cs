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
using POS.MediatR.Accouting.Services;
using POS.MediatR.CommandAndQuery;
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Handlers
{
    public class DeleteSalesOrderCommandHandler
          : IRequestHandler<DeleteSalesOrderCommand, ServiceResponse<bool>>
    {
        private readonly ISalesOrderRepository _salesOrderRepository;
        private readonly ILogger<DeleteSalesOrderCommandHandler> _logger;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly ITaxRepository _taxRepository;
        private readonly IUnitConversationRepository _unitConversationRepository;
        private readonly IAccountingService _accountingService;
        private readonly ITransactionRepository _transactionRepository;
        private readonly ITransactionItemRepository _transactionItemRepository;
        private readonly IStockAdjustmentRepository _stockAdjustmentRepository;
        private readonly IPaymentEntryRepository _paymentEntryRepository;
        private readonly ITaxEntryRepository _taxEntryRepository;
        private readonly IAccountingEntryRepository _accountingEntryRepository;
        private readonly IInventoryService _inventoryService;

        public DeleteSalesOrderCommandHandler(ISalesOrderRepository salesOrderRepository,
            ILogger<DeleteSalesOrderCommandHandler> logger,
            IUnitOfWork<POSDbContext> uow,
            ITaxRepository taxRepository,
            IUnitConversationRepository unitConversationRepository,
            IAccountingService accountingService,
            ITransactionRepository transactionRepository,
            ITransactionItemRepository transactionItemRepository,
            IPaymentEntryRepository paymentEntryRepository,
            ITaxEntryRepository taxEntryRepository,
            IAccountingEntryRepository accountingEntryRepository,
            IInventoryService inventoryService)
        {
            _salesOrderRepository = salesOrderRepository;
            _logger = logger;
            _uow = uow;
            _taxRepository = taxRepository;
            _unitConversationRepository = unitConversationRepository;
            _accountingService = accountingService;
            _transactionRepository = transactionRepository;
            _transactionItemRepository = transactionItemRepository;
            _paymentEntryRepository = paymentEntryRepository;
            _taxEntryRepository = taxEntryRepository;
            _accountingEntryRepository = accountingEntryRepository;
            _inventoryService = inventoryService;
        }
        public async Task<ServiceResponse<bool>> Handle(DeleteSalesOrderCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var salesOrder = await _salesOrderRepository.All
                   .Include(c => c.SalesOrderItems)
                        .ThenInclude(c => c.SalesOrderItemTaxes).FirstOrDefaultAsync(c => c.Id == request.Id);
                if (salesOrder == null)
                {
                    _logger.LogError("Sales order does not exists.");
                    return ServiceResponse<bool>.Return404();
                }
                if (salesOrder.Status == SalesOrderStatus.Return)
                {
                    return ServiceResponse<bool>.Return409("Sales Order can't delete becuase it's already Return.");
                }
                _salesOrderRepository.Delete(salesOrder);
                //Remove accounting
                try
                {
                    var transactions = await _transactionRepository.All
                        .Where(c => c.ReferenceNumber == salesOrder.OrderNumber)
                            .Include(c => c.TransactionItems).ThenInclude(c => c.TransactionItemTaxes)
                            .Include(c => c.PaymentEntries)
                            .Include(c => c.TaxEntries)
                            .Include(c => c.AccountingEntries).ToListAsync();

                    if (transactions.Any())
                    {
                        foreach (var transaction in transactions)
                        {
                            if (transaction.TransactionType == TransactionType.Payment)
                            {
                                _accountingEntryRepository.RemoveRange(transaction.AccountingEntries);
                                _paymentEntryRepository.RemoveRange(transaction.PaymentEntries);
                                _transactionRepository.Delete(transaction);
                            }
                            else
                            {
                                _transactionItemRepository.RemoveRange(transaction.TransactionItems);
                                _taxEntryRepository.RemoveRange(transaction.TaxEntries);
                                _accountingEntryRepository.RemoveRange(transaction.AccountingEntries);

                                //remove inventory
                                transaction.TransactionType = TransactionType.SaleReturn;

                                await _inventoryService.ProcessInventoryChangesAsync(transaction);
                                _transactionRepository.Delete(transaction);

                            }
                        }

                    }
                }
                catch (System.Exception ex)
                {
                    _logger.LogError(ex, "error while removing Accounting");
                }
                if (await _uow.SaveAsync() <= 0)
                {
                    _logger.LogError("Error while deleting Sales order.");
                    return ServiceResponse<bool>.Return500();
                }


                return ServiceResponse<bool>.ReturnSuccess();
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while Deleting SalesOrder");
                return ServiceResponse<bool>.Return500("error while Deleting SalesOrder");
            }
        }
    }

}
