using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data.Dto;
using POS.Data.Entities.Accounts;
using POS.Domain;
using POS.Helper;
using POS.MediatR.Accouting.Services;
using POS.MediatR.CommandAndQuery;
using POS.Repository;
using POS.Repository.Accouting;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Handlers
{
    public class DeleteExpenseCommandHanlder 
        : IRequestHandler<DeleteExpenseCommand, ServiceResponse<bool>>
    {
        private readonly IExpenseRepository _expenseRepository;
        private readonly ILogger<DeleteExpenseCommandHanlder> _logger;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly ITransactionRepository _transactionRepository;
        private readonly ITransactionItemRepository _transactionItemRepository;
        private readonly IAccountingService _accountingService;
        private readonly IStockAdjustmentRepository _stockAdjustmentRepository;
        private readonly IPaymentEntryRepository _paymentEntryRepository;
        private readonly ITaxEntryRepository _taxEntryRepository;
        private readonly IAccountingEntryRepository _accountingEntryRepository;
        private readonly IInventoryService _inventoryService;
        public DeleteExpenseCommandHanlder(IExpenseRepository expenseRepository,
            ILogger<DeleteExpenseCommandHanlder> logger,
            IUnitOfWork<POSDbContext> uow,
            IAccountingService accountingService,
            ITransactionRepository transactionRepository,
            ITransactionItemRepository transactionItemRepository,
            IPaymentEntryRepository paymentEntryRepository,
            ITaxEntryRepository taxEntryRepository,
            IAccountingEntryRepository accountingEntryRepository,
            IInventoryService inventoryService)
        {
            _expenseRepository = expenseRepository;
            _logger = logger;
            _uow = uow;
            _accountingService = accountingService;
            _transactionRepository = transactionRepository;
            _transactionItemRepository = transactionItemRepository;
            _paymentEntryRepository = paymentEntryRepository;
            _taxEntryRepository = taxEntryRepository;
            _accountingEntryRepository = accountingEntryRepository;
            _inventoryService = inventoryService;
        }

        public async Task<ServiceResponse<bool>> Handle(DeleteExpenseCommand request, CancellationToken cancellationToken)
        {
            var entityExist = await _expenseRepository.FindAsync(request.Id);
            if (entityExist == null)
            {
                _logger.LogError("Expense does not exists.");
                return ServiceResponse<bool>.Return404();
            }

            entityExist.IsDeleted = true;
            _expenseRepository.Update(entityExist);
            
            if (await _uow.SaveAsync() <= 0) 
            {
                _logger.LogError("Error while saving Expense.");
                return ServiceResponse<bool>.Return500();
            }
            //Remove accounting
            try
            {
                var transaction = await _transactionRepository.All
                    .Where(c => c.ReferenceNumber == entityExist.Reference)
                        .Include(c => c.TransactionItems).ThenInclude(c => c.TransactionItemTaxes)
                        .Include(c => c.PaymentEntries)
                        .Include(c => c.TaxEntries)
                        .Include(c => c.AccountingEntries).FirstOrDefaultAsync();
                if (transaction != null)
                {
                    _transactionItemRepository.RemoveRange(transaction.TransactionItems);
                    _paymentEntryRepository.RemoveRange(transaction.PaymentEntries);
                    _taxEntryRepository.RemoveRange(transaction.TaxEntries);
                    _accountingEntryRepository.RemoveRange(transaction.AccountingEntries);

                    //remove inventory
                    transaction.TransactionType = TransactionType.SaleReturn;
                    _transactionRepository.Remove(transaction);

                    await _inventoryService.ProcessInventoryChangesAsync(transaction);
                }
            }
            catch (System.Exception ex)
            {

            }
            return ServiceResponse<bool>.ReturnResultWith204();
        }
    }
}
