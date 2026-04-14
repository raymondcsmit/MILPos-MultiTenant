using AutoMapper;
using MediatR;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Domain;
using POS.Helper;
using POS.MediatR.Accouting.Services;
using POS.MediatR.Accouting.Strategies;
using POS.MediatR.CommandAndQuery;
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using POS.Common.Services;
using System.Threading;
using System.Linq;
using System.IO;

namespace POS.MediatR.Handlers
{
    public class UpdateExpenseCommandHandler
        : IRequestHandler<UpdateExpenseCommand, ServiceResponse<bool>>
    {
        private readonly IExpenseRepository _expenseRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly IMapper _mapper;
        private readonly ILogger<UpdateExpenseCommandHandler> _logger;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly PathHelper _pathHelper;
        private readonly IExpenseTaxRepository _expenseTaxRepository;
        private readonly ITransactionRepository _transactionRepository;
        private readonly ITransactionItemRepository _transactionItemRepository;
        private readonly IAccountingService _accountingService;
        private readonly IStockAdjustmentRepository _stockAdjustmentRepository;
        private readonly IPaymentEntryRepository _paymentEntryRepository;
        private readonly ITaxEntryRepository _taxEntryRepository;
        private readonly IAccountingEntryRepository _accountingEntryRepository;
        private readonly IInventoryService _inventoryService;
        private readonly IFinancialYearRepository _financialYearRepository;
        private readonly ITransactionStrategyFactory  _transactionStrategyFactory;
        private readonly IFileStorageService _fileStorageService;

        public UpdateExpenseCommandHandler(
            IExpenseRepository expenseRepository,
            IUnitOfWork<POSDbContext> uow,
            IMapper mapper,
            ILogger<UpdateExpenseCommandHandler> logger,
            IWebHostEnvironment webHostEnvironment,
            PathHelper pathHelper,
            IExpenseTaxRepository expenseTaxRepository,
             IAccountingService accountingService,
            ITransactionRepository transactionRepository,
            ITransactionItemRepository transactionItemRepository,
            IPaymentEntryRepository paymentEntryRepository,
            ITaxEntryRepository taxEntryRepository,
            IAccountingEntryRepository accountingEntryRepository,
            IInventoryService inventoryService,
            IFinancialYearRepository financialYearRepository,

            ITransactionStrategyFactory transactionStrategyFactory,
            IFileStorageService fileStorageService)
        {
            _expenseRepository = expenseRepository;
            _uow = uow;
            _mapper = mapper;
            _logger = logger;
            _webHostEnvironment = webHostEnvironment;
            _pathHelper = pathHelper;
            _expenseTaxRepository = expenseTaxRepository;
            _accountingService = accountingService;
            _transactionRepository = transactionRepository;
            _transactionItemRepository = transactionItemRepository;
            _paymentEntryRepository = paymentEntryRepository;
            _taxEntryRepository = taxEntryRepository;
            _accountingEntryRepository = accountingEntryRepository;
            _inventoryService = inventoryService;
            _financialYearRepository = financialYearRepository;
            _transactionStrategyFactory = transactionStrategyFactory;
            _fileStorageService = fileStorageService;
        }

        public async Task<ServiceResponse<bool>> Handle(UpdateExpenseCommand request, CancellationToken cancellationToken)
        {
            try
            {
                await _uow.BeginTransactionAsync();

                var entityExist = await _expenseRepository.All.Where(c=>c.Id==request.Id).FirstOrDefaultAsync();
                if (entityExist == null)
                {
                    _logger.LogError("Expense does not exists.");
                    return ServiceResponse<bool>.Return409("Expense does not exists.");
                }

                var expenseTaxes = _expenseTaxRepository.All.Where(c=>c.ExpenseId== request.Id).ToList();
                if (expenseTaxes.Count > 0)
                {
                    _expenseTaxRepository.RemoveRange(expenseTaxes);
                }

                _mapper.Map(request, entityExist);

                if (entityExist.ExpenseTaxes != null && entityExist.ExpenseTaxes.Any())
                {
                    entityExist.ExpenseTaxes.ForEach(x => x.Tax = null);
                }

                if (request.IsReceiptChange)
                {
                    if (!string.IsNullOrWhiteSpace(request.DocumentData)
                        && !string.IsNullOrWhiteSpace(request.ReceiptName))
                    {
                        var extension = Path.GetExtension(request.ReceiptName);
                        var id = Guid.NewGuid();
                        var path = $"{id}{extension}";
                        try
                        {
                             await _fileStorageService.SaveFileAsync(_pathHelper.Attachments, request.DocumentData, path);
                             entityExist.ReceiptPath = path;
                        }
                        catch
                        {
                            _logger.LogError("Error while saving files", entityExist);
                        }
                    }
                    else
                    {
                        entityExist.ReceiptPath = null;
                        entityExist.ReceiptName = null;
                    }
                }

                _expenseRepository.Update(entityExist);
              
                //Remove accounting
                var oldtransaction = await _transactionRepository.All
                       .Where(c => c.ReferenceNumber == entityExist.Reference)
                           .Include(c => c.AccountingEntries).FirstOrDefaultAsync();

                if (oldtransaction != null)
                {
                    _accountingEntryRepository.RemoveRange(oldtransaction.AccountingEntries);
                    _transactionRepository.Remove(oldtransaction);
                }
                if (await _uow.SaveAsync() <= 0)
                {
                    await _uow.RollbackTransactionAsync();
                    _logger.LogError("Error while saving Expense.");
                    return ServiceResponse<bool>.Return500();
                }

                //Add Accounting and transaction
                var requestTaxIds = request.ExpenseTaxIds?.ToList() ?? new List<Guid>();
                //Current financial Year
                var financialYearId = await _financialYearRepository.All.Where(c => !c.IsClosed).Select(c => c.Id).FirstOrDefaultAsync();

                //Save Transaction
                var transaction = new Transaction
                {
                    FinancialYearId = financialYearId,
                    BranchId = request.LocationId,
                    SubTotal = request.Amount - request.TotalTax, //Amount-TaxTotal
                    TaxAmount = request.TotalTax,
                    BalanceAmount = 0,
                    CreatedDate = DateTime.UtcNow,
                    DiscountAmount = 0,
                    Narration = "Expense",
                    PaidAmount = 0,
                    RoundOffAmount = 0,
                    Status = TransactionStatus.Completed,
                    ReferenceNumber = request.Reference,
                    TotalAmount = request.Amount,
                    TransactionDate = DateTime.UtcNow,
                    TransactionType = TransactionType.Expense,
                    TransactionNumber = await _transactionRepository.GenerateTransactionNumberAsync(TransactionType.Expense)
                };
                //save transaction
                await _expenseRepository.ProcessTransactionAsync(transaction);
                //temp transaction
                var strategy = _transactionStrategyFactory.GetStrategy(transaction.TransactionType);
                var tempTransaction = new Transaction
                {
                    Id = transaction.Id,
                    BranchId = transaction.BranchId,
                    SubTotal = transaction.SubTotal,
                    TaxAmount = transaction.TaxAmount,
                    TotalAmount = transaction.TotalAmount,
                    ReferenceNumber = transaction.ReferenceNumber,
                    Narration = transaction.Narration,
                    FinancialYearId = transaction.FinancialYearId,
                    TransactionItems = new List<TransactionItem>
                    {
                        new TransactionItem
                        {
                            TransactionItemTaxes = requestTaxIds
                                    .Select(taxId => new TransactionItemTax { TaxId = taxId }).ToList()
                        }

                    }
                };
                //Save Accounting
                await strategy.ProcessTransactionAsync(tempTransaction);
                if (await _uow.SaveAsync() <= 0)
                {
                    await _uow.RollbackTransactionAsync();
                    _logger.LogError("Error while saving Expense");
                    return ServiceResponse<bool>.Return500();
                }

                await _uow.CommitTransactionAsync();
                return ServiceResponse<bool>.ReturnSuccess();
            }
            catch (System.Exception ex)
            {
                await _uow.RollbackTransactionAsync();
                _logger.LogError(ex, "Error while saving Accounting or Expense");
                return ServiceResponse<bool>.Return500();
            }
        }
    }
}
