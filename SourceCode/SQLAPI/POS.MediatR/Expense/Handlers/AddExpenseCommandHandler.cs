using AutoMapper;
using MediatR;
using Microsoft.AspNetCore.Hosting;
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
    public class AddExpenseCommandHandler
        : IRequestHandler<AddExpenseCommand, ServiceResponse<ExpenseDto>>
    {
        private readonly IExpenseRepository _expenseRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly IMapper _mapper;
        private readonly ILogger<AddExpenseCommandHandler> _logger;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly PathHelper _pathHelper;
        private readonly IAccountingService _accountingService;
        private readonly ITransactionRepository _transactionRepository;
        private readonly ITransactionStrategyFactory _transactionStrategyFactory;
        private readonly ITaxRepository _taxRepository;
        private readonly IFinancialYearRepository _financialYearRepository;
        private readonly IFileStorageService _fileStorageService;

        public AddExpenseCommandHandler(
            IExpenseRepository expenseRepository,
            IUnitOfWork<POSDbContext> uow,
            IMapper mapper,
            ILogger<AddExpenseCommandHandler> logger,
            IWebHostEnvironment webHostEnvironment,
            PathHelper pathHelper,
            IAccountingService accountingService,
            ITaxRepository taxRepository,
            ITransactionRepository transactionRepository,
            IExpenseStrategy expenseStrategy,
            ITransactionStrategyFactory transactionStrategyFactory,
            IFinancialYearRepository financialYearRepository,
            IFileStorageService fileStorageService

           )
        {
            _expenseRepository = expenseRepository;
            _uow = uow;
            _mapper = mapper;
            _logger = logger;
            _webHostEnvironment = webHostEnvironment;
            _pathHelper = pathHelper;
            _accountingService = accountingService;
            _transactionRepository = transactionRepository;
            _transactionStrategyFactory = transactionStrategyFactory;
            _taxRepository = taxRepository;

            _financialYearRepository = financialYearRepository;
            _fileStorageService = fileStorageService;

        }

        public async Task<ServiceResponse<ExpenseDto>> Handle(AddExpenseCommand request, CancellationToken cancellationToken)
        {

            var entity = _mapper.Map<Expense>(request);

            var referenceNo = await _expenseRepository.All.Where(e => !e.IsDeleted && e.Reference.ToLower() == request.Reference.ToLower())
                .FirstOrDefaultAsync();
            if (referenceNo != null)
            {
                return ServiceResponse<ExpenseDto>.Return409("Reference number already exist");
            }

            var requestTaxIds = request.ExpenseTaxIds?.ToList() ?? new List<Guid>();

            if (entity.ExpenseTaxes != null && entity.ExpenseTaxes.Any())
            {
                entity.ExpenseTaxes.ForEach(x => x.Tax = null);
            }

            if (!string.IsNullOrWhiteSpace(request.ReceiptName) && !string.IsNullOrWhiteSpace(request.DocumentData))
            {
                var extension = Path.GetExtension(request.ReceiptName);
                var id = Guid.NewGuid();
                var path = $"{id}{extension}";
                
                try
                {
                    await _fileStorageService.SaveFileAsync(_pathHelper.Attachments, request.DocumentData, path);
                    entity.ReceiptPath = path;
                }
                catch
                {
                    _logger.LogError("Error while saving files", entity);
                }
            }

            //Add Accounting and transaction
            try
            {
                //Current Year
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
                    TransactionNumber = await _transactionRepository.GenerateTransactionNumberAsync(TransactionType.Expense),

                };
                await _expenseRepository.ProcessTransactionAsync(transaction);

                //Save Accounting with Tax
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
                await strategy.ProcessTransactionAsync(tempTransaction);

            }

            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while saving expense Accounting ");
            }
            _expenseRepository.Add(entity);
            if (await _uow.SaveAsync() <= 0)
            {
                _logger.LogError("Error while saving Expense");
                return ServiceResponse<ExpenseDto>.Return500();
            }
            var industrydto = _mapper.Map<ExpenseDto>(entity);

            return ServiceResponse<ExpenseDto>.ReturnResultWith200(industrydto);
        }
    }
}
