using Amazon.Runtime.Internal.Util;
using Amazon.SimpleEmail.Model;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Dto.Acconting;
using POS.Data.Dto.Acconting.YearEndClosing;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Domain;
using POS.Helper;
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting.YearEndClosing
{
    public class AddYearEndClosingCommandHandler(
        IAccountingEntryRepository _accountingEntryRepository,
        ITransactionRepository _transactionRepository,
        ILogger<AddYearEndClosingCommandHandler> _logger,
        ILedgerAccountRepository _ledgerAccountRepository,
        IFinancialYearRepository _financialYearRepository,
        IAccountingEntryFactory _accountingEntryFactory,
        IUnitOfWork<POSDbContext> _uow,
        ILocationRepository _locationRepository,
        UserInfoToken _userInfoToken) : IRequestHandler<AddYearEndClosingCommand, ServiceResponse<List<YearEndClosingResultDto>>>
    {
        public async Task<ServiceResponse<List<YearEndClosingResultDto>>> Handle(AddYearEndClosingCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var currentYear = await _financialYearRepository.All.Where(c => !c.IsClosed).FirstOrDefaultAsync();
                if (currentYear == null)
                {
                    return ServiceResponse<List<YearEndClosingResultDto>>.Return404("year not found");
                }
                currentYear.ClosedDate = DateTime.UtcNow;
                currentYear.ClosedBy = _userInfoToken.Id;
                //add New year
                var newYear = new FinancialYear
                {
                    Id = Guid.NewGuid(),    
                    StartDate = currentYear.StartDate.AddYears(1),
                    EndDate = currentYear.EndDate.AddYears(1),
                    IsClosed = false,
                    ClosedDate = null,
                };
                var YearEndClosingResultDtos=new List<YearEndClosingResultDto>();

                var accountingEntry = await _accountingEntryRepository.All.Where(c=>c.FinancialYearId==currentYear.Id)
                    .Include(c => c.Transaction)
                    .Include(c=>c.CreditLedgerAccount)
                    .Include(c=>c.DebitLedgerAccount).ToListAsync();
                var branchIds = await _locationRepository.All.Select(c => c.Id).ToListAsync();
                var ledgerAccounts = await _ledgerAccountRepository.All.ToListAsync();
                var retainedEarnings = ledgerAccounts.Where(c => c.AccountCode == "3200").FirstOrDefault();
                var incomeSummary = ledgerAccounts.Where(c => c.AccountCode == "3100").FirstOrDefault();
                var openingBalanceEquity = ledgerAccounts.Where(c => c.AccountCode == "5555").FirstOrDefault();

                foreach (var branchId in branchIds)
                {
                    var incomeTotal = accountingEntry
                        .Where(c => c.FinancialYearId == currentYear.Id &&
                        
                        c.CreditLedgerAccount.AccountType == AccountType.Income).Sum(e => e.Amount);

                    var expenseTotal = accountingEntry
                        .Where(c => c.FinancialYearId == currentYear.Id &&
                    c.DebitLedgerAccount.AccountType == AccountType.Expense).Sum(e => e.Amount);


                    // net Profitt or loss 
                    decimal netProfitOrLoss = incomeTotal - expenseTotal;

                    var resultDto = new YearEndClosingResultDto
                    {
                        TotalIncome = incomeTotal,
                        TotalExpense = expenseTotal,
                        NetProfitOrLoss = netProfitOrLoss,
                        BranchId=branchId
                    };
                    YearEndClosingResultDtos.Add(resultDto);
                    // close Year Transaction
                    var closetransaction = new Transaction
                    {
                        //Id = Guid.NewGuid(),
                        BranchId = branchId,
                        Narration = $"Close the year - {(netProfitOrLoss > 0 ? "Net Profit" : "Net Loss")} ",
                        ReferenceNumber = "",
                        TransactionDate = DateTime.UtcNow,
                        TransactionType = TransactionType.YearEndClosing,
                        TotalAmount = Math.Abs(netProfitOrLoss),
                        FinancialYearId = currentYear.Id,
                        TransactionNumber = await _transactionRepository.GenerateTransactionNumberAsync(
                        TransactionType.YearEndClosing),
                    };
                    _transactionRepository.Add(closetransaction);
                    // Opning Year Transaction
                    var openingtransaction = new Transaction
                    {
                        //Id = Guid.NewGuid(),
                        BranchId = branchId,
                        Narration = $"Open the new year",
                        ReferenceNumber = "",
                        TransactionDate = DateTime.UtcNow,
                        TransactionType = TransactionType.OpeningBalance,
                        TotalAmount = 0.0m,
                        FinancialYearId = newYear.Id,
                        TransactionNumber = await _transactionRepository.GenerateTransactionNumberAsync(
                        TransactionType.OpeningBalance)
                    };
                    _transactionRepository.Add(openingtransaction);

                    if (netProfitOrLoss != 0)
                    {
                        //Closing Year
                        var retainedEarningsEntry = await _accountingEntryFactory.CreateEntryAsync(
                            closetransaction.Id,
                           branchId,
                            netProfitOrLoss < 0 ? retainedEarnings.Id : incomeSummary.Id,
                            netProfitOrLoss > 0 ? retainedEarnings.Id : incomeSummary.Id,
                            Math.Abs(closetransaction.TotalAmount),
                            closetransaction.Narration,
                            closetransaction.ReferenceNumber,
                            closetransaction.FinancialYearId,
                            EntryType.YearEndClosing
                        );
                       
                        _accountingEntryRepository.Add(retainedEarningsEntry);
                    }
                    var entries = accountingEntry.
                        Where(e => e.FinancialYearId == currentYear.Id && e.BranchId == branchId)
                        .Select(e => new
                        {
                            e.DebitLedgerAccountId,
                            e.CreditLedgerAccountId,
                            e.Amount
                        }).ToList();

                    // Carry Forword Current Year retainedEarning For New Year
                    if (netProfitOrLoss != 0)
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
                         }).GroupBy(x => x.AccountId)
                         .Select(g => new
                         {
                             AccountId = g.Key,
                             Debit = g.Sum(x => x.Debit),
                             Credit = g.Sum(x => x.Credit)
                         }).ToList();

                    var accountIds = balances.Select(b => b.AccountId).ToList();
                    var accounts = ledgerAccounts
                        .Where(a => accountIds.Contains(a.Id))
                        .ToDictionary(a => a.Id, a => a);

                    foreach (var balance in balances)
                    {
                        if (!accounts.TryGetValue(balance.AccountId, out var account))
                        {
                            continue;
                        }
                        //skip if accountType is Income and Expense
                        if (account.AccountType == AccountType.Income || account.AccountType == AccountType.Expense || account.IsTemporary)
                            continue;

                        decimal closingBalance = balance.Debit - balance.Credit;
                        if (closingBalance == 0) continue;

                        var openingEntry = await _accountingEntryFactory.CreateEntryAsync(
                            openingtransaction.Id,
                            branchId,
                            closingBalance > 0 ? balance.AccountId : openingBalanceEquity.Id,
                            closingBalance < 0 ? balance.AccountId : openingBalanceEquity.Id,
                            Math.Abs(closingBalance),
                            $"Opening balance carry forward - {account.AccountName} - {(closingBalance > 0 ? "Debit" : "Credit")}",
                            "",
                            newYear.Id,
                            EntryType.OpeningBalance
                        );

                        _accountingEntryRepository.Add(openingEntry);
                        resultDto.OpeningBalances.Add(new AccountOpeningBalanceDto
                        {
                            AccountId = account.Id,
                            AccountName = account.AccountName,
                            Debit = closingBalance > 0 ? closingBalance : 0,
                            Credit = closingBalance < 0 ? Math.Abs(closingBalance) : 0
                        });
                    }
                }
                _financialYearRepository.Add(newYear);
                currentYear.IsClosed = true;
                _financialYearRepository.Update(currentYear);
                //_transactionRepository.Add(openingtransaction);
                if (await _uow.SaveAsync() <= 0)
                {
                    return ServiceResponse<List<YearEndClosingResultDto>>.Return500();
                }
                return ServiceResponse<List<YearEndClosingResultDto>>.ReturnResultWith200(YearEndClosingResultDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "error while closing Current year");
                return ServiceResponse<List<YearEndClosingResultDto>>.Return404("error while closing Current year");
            }
        }
    }
}
