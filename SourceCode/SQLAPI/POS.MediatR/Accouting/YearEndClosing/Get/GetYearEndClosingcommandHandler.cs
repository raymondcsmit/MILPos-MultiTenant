using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Data.Dto.Acconting.YearEndClosing;
using POS.Data.Entities.Accounts;
using POS.Helper;
using POS.MediatR.Accouting.YearEndClosing.Get;
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting
{
    public class GetYearEndClosingcommandHandler(
        IAccountingEntryRepository _accountingEntryRepository,
        ILedgerAccountRepository _ledgerAccountRepository,
        ILocationRepository _locationRepository,
        IFinancialYearRepository _financialYearRepository,
        ILogger<GetYearEndClosingcommandHandler> _logger) : IRequestHandler<GetYearEndClosingcommand, ServiceResponse<List<YearEndClosingResultDto>>>
    {
        public async Task<ServiceResponse<List<YearEndClosingResultDto>>> Handle(GetYearEndClosingcommand request, CancellationToken cancellationToken)
        {
            try
            {
                var currentYear = await _financialYearRepository.All
                    .FirstOrDefaultAsync(c => c.Id == request.FinancialYearId, cancellationToken);

                if (currentYear == null)
                {
                    return ServiceResponse<List<YearEndClosingResultDto>>.Return404("Financial year not found");
                }
                var accountingEntry = _accountingEntryRepository.All.Where(c => c.FinancialYearId == request.FinancialYearId)
                    .Include(c => c.Transaction)
                    .Include(c => c.CreditLedgerAccount)
                    .Include(c => c.DebitLedgerAccount).AsQueryable();
                if (request.BranchId.HasValue)
                {
                    accountingEntry.Where(c => c.BranchId == request.BranchId.Value);
                }


                var branchIds = await _locationRepository.All.Select(c => c.Id).ToListAsync(cancellationToken);
                var ledgerAccounts = await _ledgerAccountRepository.All.ToListAsync(cancellationToken);

                var retainedEarnings = ledgerAccounts.FirstOrDefault(c => c.AccountCode == "3200");
                var incomeSummary = ledgerAccounts.FirstOrDefault(c => c.AccountCode == "3100");
                var openingBalanceEquity = ledgerAccounts.FirstOrDefault(c => c.AccountCode == "5555");

                var resultList = new List<YearEndClosingResultDto>();

                foreach (var branchId in branchIds)
                {
                    var incomeTotal = accountingEntry
                        .Where(c => c.BranchId == branchId && c.CreditLedgerAccount.AccountType == AccountType.Income)
                        .Sum(e => e.Amount);

                    var expenseTotal = accountingEntry
                        .Where(c => c.BranchId == branchId && c.DebitLedgerAccount.AccountType == AccountType.Expense)
                        .Sum(e => e.Amount);

                    decimal netProfitOrLoss = incomeTotal - expenseTotal;

                    var resultDto = new YearEndClosingResultDto
                    {
                        TotalIncome = incomeTotal,
                        TotalExpense = expenseTotal,
                        NetProfitOrLoss = netProfitOrLoss,
                        BranchId = branchId
                    };

                    var entries = accountingEntry
                        .Where(e => e.BranchId == branchId)
                        .Select(e => new
                        {
                            e.DebitLedgerAccountId,
                            e.CreditLedgerAccountId,
                            e.Amount
                        }).ToList();

                    // Include retained earnings if profit/loss
                    if (netProfitOrLoss != 0 && retainedEarnings != null && incomeSummary != null)
                    {
                        entries.Add(new
                        {
                            DebitLedgerAccountId = netProfitOrLoss < 0 ? retainedEarnings.Id : incomeSummary.Id,
                            CreditLedgerAccountId = netProfitOrLoss > 0 ? retainedEarnings.Id : incomeSummary.Id,
                            Amount = Math.Abs(netProfitOrLoss)
                        });
                    }

                    var balances = entries
                        .SelectMany(e => new[]
                        {
                            new { AccountId = e.DebitLedgerAccountId, Debit = e.Amount, Credit = 0m },
                            new { AccountId = e.CreditLedgerAccountId, Debit = 0m, Credit = e.Amount }
                        })
                        .GroupBy(x => x.AccountId)
                        .Select(g => new
                        {
                            AccountId = g.Key,
                            Debit = g.Sum(x => x.Debit),
                            Credit = g.Sum(x => x.Credit)
                        })
                        .ToList();

                    var accountIds = balances.Select(b => b.AccountId).ToList();
                    var accounts = ledgerAccounts
                        .Where(a => accountIds.Contains(a.Id))
                        .ToDictionary(a => a.Id, a => a);

                    foreach (var balance in balances)
                    {
                        if (!accounts.TryGetValue(balance.AccountId, out var account)) continue;

                        // Skip income & expense accounts
                        if (account.AccountType == AccountType.Income || account.AccountType == AccountType.Expense || account.IsTemporary)
                            continue;

                        decimal closingBalance = balance.Debit - balance.Credit;
                        if (closingBalance == 0) continue;

                        resultDto.OpeningBalances.Add(new AccountOpeningBalanceDto
                        {
                            AccountId = account.Id,
                            AccountName = account.AccountName,
                            Debit = closingBalance > 0 ? closingBalance : 0,
                            Credit = closingBalance < 0 ? Math.Abs(closingBalance) : 0
                        });
                    }

                    resultList.Add(resultDto);
                }

                return ServiceResponse<List<YearEndClosingResultDto>>.ReturnResultWith200(resultList);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while fetching year end closing preview");
                return ServiceResponse<List<YearEndClosingResultDto>>.Return500();
            }
        
    }
    }
}
