using Amazon.Runtime.Internal.Util;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Identity.Client;
using POS.Data.Dto.Acconting.Report;
using POS.Helper;
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting.Report
{
    public class GetLedgerAccountBalancesCommandHandler(
        IAccountingEntryRepository _accountingEntryRepository,
        ILogger<GetLedgerAccountBalancesCommandHandler> _logger,
        ILedgerAccountRepository _ledgerAccountRepository) : IRequestHandler<GetLedgerAccountBalancesCommand, ServiceResponse<List<LedgerAccountBalancesDto>>>
    {
        public async Task<ServiceResponse<List<LedgerAccountBalancesDto>>> Handle(GetLedgerAccountBalancesCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var accounts = await _ledgerAccountRepository.All.Select(c => new
                {
                    c.AccountName,
                    c.AccountCode,
                    c.Id,
                }).ToListAsync();

                var accountIds = accounts.Select(c => c.Id).ToList();

                var accountingQuery = _accountingEntryRepository.All.Where(c => c.FinancialYearId == request.FinancialYearId).AsNoTracking();
                if (request.BranchId.HasValue)
                {
                    accountingQuery = accountingQuery.Where(c => c.BranchId == request.BranchId.Value);
                }

                var balances = accountingQuery.AsEnumerable()
                .SelectMany(c => new[]
                 {
                    new { AccountId = c.DebitLedgerAccountId, Debit = c.Amount, Credit = 0m },
                    new { AccountId = c.CreditLedgerAccountId, Debit = 0m, Credit = c.Amount }
                 })
                .Where(x => accountIds.Contains(x.AccountId))
                .GroupBy(x => x.AccountId)
                .Select(g => new
                {
                    AccountId = g.Key,
                    DebitTotal = g.Sum(x => x.Debit),
                    CreditTotal = g.Sum(x => x.Credit)
                }).ToList();

                var accountDict = accounts.ToDictionary(a => a.Id, a => a.AccountName);

                var ledgerAccounts = balances
                    .Select(b => new LedgerAccountBalancesDto
                    {
                        AccountName = accountDict.TryGetValue(b.AccountId, out var name) ? name : string.Empty,
                        DebitTotals = b.DebitTotal,
                        CreditTotal = b.CreditTotal
                    })
                    .ToList();
                return ServiceResponse<List<LedgerAccountBalancesDto>>.ReturnResultWith200(ledgerAccounts);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "error while getting AccountBalance");
                return ServiceResponse<List<LedgerAccountBalancesDto>>.Return500("error while getting AccountBalance");
            }
        }
    }
}
