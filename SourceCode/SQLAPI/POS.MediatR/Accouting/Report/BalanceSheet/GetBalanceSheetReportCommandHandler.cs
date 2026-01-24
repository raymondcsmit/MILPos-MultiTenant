using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Data.Dto.Acconting;
using POS.Data.Entities.Accounts;
using POS.Helper;
using POS.Repository;
using POS.Repository.Accouting;

namespace POS.MediatR.Accouting.Report
{
    public class GetBalanceSheetReportCommandHandler(
        IAccountingEntryRepository _accountingEntryRepository,
        ILedgerAccountRepository _ledgerAccountRepository,
        IFinancialYearRepository _financialYearRepository,
        ILogger<GetBalanceSheetReportCommandHandler> _logger) : IRequestHandler<GetBalanceSheetReportCommand, ServiceResponse<BalanceSheetDto>>

    {
        public async Task<ServiceResponse<BalanceSheetDto>> Handle(GetBalanceSheetReportCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var financialYear = await _financialYearRepository.All.Where(c => c.Id == request.FinancialYearId).FirstOrDefaultAsync(cancellationToken);
                if (financialYear == null)
                {
                    return ServiceResponse<BalanceSheetDto>.Return404("Financial Year Not Found");
                }
                var accounts = await _ledgerAccountRepository.All.ToListAsync(cancellationToken);

                var accountingQuery = _accountingEntryRepository.All
                    .Where(e => e.FinancialYearId == financialYear.Id).AsNoTracking();
                if (request.BranchId.HasValue)
                {
                    accountingQuery = accountingQuery.Where(e => e.BranchId == request.BranchId);
                }
                var accountingEntries = await accountingQuery.ToListAsync(cancellationToken);

                List<AccountBalanceDto> accountBalances = new List<AccountBalanceDto>();
                // Leadger Accountwise  Calculation
                foreach (var acct in accounts)
                {
                    var debitEntries = accountingEntries.Where(e => e.DebitLedgerAccountId == acct.Id);
                    var creditEntries = accountingEntries.Where(e => e.CreditLedgerAccountId == acct.Id);

                    decimal debit = debitEntries.Sum(e => e.Amount);
                    decimal credit = creditEntries.Sum(e => e.Amount); 

                    decimal balance = 0;
                    if (acct.AccountType == AccountType.Asset)
                    {
                        balance = debit - credit;
                    }
                    else if (acct.AccountType == AccountType.Liability || acct.AccountType == AccountType.Equity)
                    {
                        balance = credit - debit;
                    }
                    else if (acct.AccountType == AccountType.Income)
                    {
                        balance = credit - debit;
                    }
                    else if (acct.AccountType == AccountType.Expense)
                    {
                        balance = debit - credit;
                    }
                    accountBalances.Add(new AccountBalanceDto
                    {
                        AccountCode = acct.AccountCode,
                        AccountName = acct.AccountName,
                        Group = acct.AccountGroup,
                        Balance = balance
                    });
                }

                var balanceSheetDto = new BalanceSheetDto();
                balanceSheetDto.Assets = accountBalances
                       .Where(a => accounts.Any(x => x.AccountCode == a.AccountCode && x.AccountType == AccountType.Asset))
                       .ToList();

                balanceSheetDto.Liabilities = accountBalances
                        .Where(a => accounts.Any(x => x.AccountCode == a.AccountCode && x.AccountType == AccountType.Liability))
                        .ToList();


                balanceSheetDto.Equity = accountBalances
                        .Where(a => accounts.Any(x => x.AccountCode == a.AccountCode &&
                            (x.AccountType == AccountType.Equity ||
                             x.AccountType == AccountType.Income ||
                             x.AccountType == AccountType.Expense)))
                        .ToList();



                // equitTotal ,incomeTotal , expenseTotal
                var totalEquity = balanceSheetDto.Equity.Where(e => accounts.Any(x => x.AccountCode == e.AccountCode && x.AccountType == AccountType.Equity))
                            .Sum(e => e.Balance);
                var incomeTotal = balanceSheetDto.Equity.Where(e => accounts.Any(x => x.AccountCode == e.AccountCode && x.AccountType == AccountType.Income))
                             .Sum(e => e.Balance);
                var expenseTotal = balanceSheetDto.Equity.Where(e => accounts.Any(x => x.AccountCode == e.AccountCode && x.AccountType == AccountType.Expense))
                              .Sum(e => e.Balance);

                //totalAssets, totalLiabilities, totalEquity
                balanceSheetDto.TotalAssets = balanceSheetDto.Assets.Sum(a => a.Balance);
                balanceSheetDto.TotalLiabilities = balanceSheetDto.Liabilities.Sum(a => a.Balance);
                balanceSheetDto.TotalEquity = (totalEquity + incomeTotal) - expenseTotal;
                return ServiceResponse<BalanceSheetDto>.ReturnResultWith200(balanceSheetDto);
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while getting BalanceSheetReport");
                return ServiceResponse<BalanceSheetDto>.Return500("error while getting BalanceSheetReport");
            }

        }
    }
}
