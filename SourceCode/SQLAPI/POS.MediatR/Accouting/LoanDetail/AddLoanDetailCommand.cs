using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data.Dto.Acconting;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Domain;
using POS.Helper;
using POS.MediatR.Accouting.Strategies;
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting;
public class AddLoanDetailCommand : IRequest<ServiceResponse<LoanDetailDto>>
{
    public Guid BranchId { get; set; }
    public decimal LoanAmount { get; set; }
    public string LenderName { get; set; }
    public DateTime LoanDate { get; set; }
    public string Narration { get; set; }
    public string LoanNumber { get; set; }
}

public class AddLoanDetailCommandHandler(
    IUnitOfWork<POSDbContext> _uow,
    ILoanDetailRepository loanDetailRepository,
    ILedgerAccountRepository ledgerAccountRepository,
    ILogger<AddLoanDetailCommandHandler> _logger,
    ITransactionRepository transactionRepository,
    IFinancialYearRepository financialYearRepository,
    ILoanStrategy loanStrategy,
    IMapper mapper
    ) : IRequestHandler<AddLoanDetailCommand, ServiceResponse<LoanDetailDto>>
{
    public async Task<ServiceResponse<LoanDetailDto>> Handle(AddLoanDetailCommand request, CancellationToken cancellationToken)
    {
        var toLoanledgerAccount = ledgerAccountRepository.All
        .Where(a => a.AccountCode == "7000")
        .FirstOrDefault();

        if (toLoanledgerAccount == null)
        {
            toLoanledgerAccount = new LedgerAccount()
            {
                Id = Guid.NewGuid(),
                AccountCode = "7000",
                AccountName = $"To Loan Account",
                AccountType = AccountType.Liability,
                AccountGroup = AccountGroup.LongTermLiability,
                ParentAccountId = null,
                IsActive = true,
            };
            ledgerAccountRepository.Add(toLoanledgerAccount);
        }

        var lastAccount = ledgerAccountRepository.All
        .Where(a => a.AccountCode.StartsWith("7"))
        .OrderByDescending(a => a.AccountCode)
        .Select(a => a.AccountCode)
        .FirstOrDefault();
        int newAccount = 0;

        if (lastAccount == null)
        {
            newAccount = 7010;
        }
        else
        {
            newAccount = int.Parse(lastAccount) + 10;
        }

        var ledgerAccountLoan = new LedgerAccount()
        {
            Id = Guid.NewGuid(),
            AccountCode = newAccount.ToString(),
            AccountName = $"Loan Payable - {request.LenderName}",
            AccountType = AccountType.Liability,
            AccountGroup = AccountGroup.LongTermLiability,
            ParentAccountId = toLoanledgerAccount.Id,
            IsActive = true,
        };
        ledgerAccountRepository.Add(ledgerAccountLoan);
        var ledgerAccountInterestExpenseAccountNo = newAccount + 10;
        var ledgerAccountInterestExpense = new LedgerAccount()
        {
            Id = Guid.NewGuid(),
            AccountCode = ledgerAccountInterestExpenseAccountNo.ToString(),
            AccountName = $"Interest On Loan Account - {request.LenderName}",
            AccountType = AccountType.Expense,
            AccountGroup = AccountGroup.IndirectExpense,
            ParentAccountId = null,
            IsActive = true,
        };
        ledgerAccountRepository.Add(ledgerAccountInterestExpense);

        var loanDetail = new LoanDetail
        {
            Id = Guid.NewGuid(),
            LoanAccountId = ledgerAccountLoan.Id,
            LoanAccountInterestExpenseId = ledgerAccountInterestExpense.Id,
            LoanAmount = request.LoanAmount,
            LenderName = request.LenderName,
            LoanDate = request.LoanDate,
            Narration = request.Narration,
            BranchId = request.BranchId,
            LoanNumber = request.LoanNumber,
        };
        loanDetailRepository.Add(loanDetail);

        var currentYear = await financialYearRepository.All.Where(c => !c.IsClosed).FirstOrDefaultAsync();
        if (currentYear == null)
        {
            return ServiceResponse<LoanDetailDto>.Return404("year not found");
        }

        // Loan Account
        var transaction = new Transaction
        {
            Id = Guid.NewGuid(),
            BranchId = request.BranchId,
            Narration = "Loan Taken ::" + ledgerAccountLoan.AccountName,
            ReferenceNumber = ledgerAccountLoan.Id.ToString(),
            TransactionDate = DateTime.UtcNow,
            TransactionType = TransactionType.LoanPayable, 
            TotalAmount = request.LoanAmount,
            FinancialYearId = currentYear.Id,
            TransactionNumber = await transactionRepository.GenerateTransactionNumberAsync(TransactionType.LoanPayable)
        };
        transaction.Status = TransactionStatus.Completed;
        transactionRepository.Add(transaction);

        await loanStrategy.ProcessLoanAsync(loanDetail, transaction);

        if (await _uow.SaveAsync() <= 0)
        {
            _logger.LogError("Save Loan Detail have Error");
            return ServiceResponse<LoanDetailDto>.Return500();
        }

        return ServiceResponse<LoanDetailDto>.ReturnResultWith200(mapper.Map<LoanDetailDto>(loanDetail));

    }
}
