using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Data.Dto.Acconting.Report;
using POS.Data.Resources;
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
    public class GetTrialBalanceCommandHandler(
        ILedgerAccountRepository _ledgerAccountRepository,
        IAccountingEntryRepository _accountingEntryRepository,
        ILogger<GetTrialBalanceCommandHandler> _logger) : IRequestHandler<GetTrialBalanceCommand, ServiceResponse<TrialBalanceDto>>
    {
        public async Task<ServiceResponse<TrialBalanceDto>> Handle(GetTrialBalanceCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var startDate = request.FromDate.ToLocalTime();
                var endDate = request.ToDate.ToLocalTime();

                DateTime minDate = new DateTime(startDate.Year, startDate.Month, startDate.Day, 0, 0, 0);
                DateTime maxDate = new DateTime(endDate.Year, endDate.Month, endDate.Day, 23, 59, 59);

                var accountingQuery = _accountingEntryRepository.All.AsNoTracking();
                if (request.LocationId.HasValue)
                {
                    accountingQuery = accountingQuery.Where(c => c.BranchId == request.LocationId.Value);
                }
                var accounts = await _ledgerAccountRepository.All
                    .Select(a => new { a.Id, a.AccountName })
                    .ToListAsync(cancellationToken);

                var accountMap = accounts.ToDictionary(a => a.Id, a => a.AccountName ?? "");

                var accountingEntries = await accountingQuery
                    .Where(c => c.EntryDate >= minDate && c.EntryDate <= maxDate)
                    .Select(c => new
                    {
                        DebitId = c.DebitLedgerAccountId,
                        CreditId = c.CreditLedgerAccountId,
                        Amount = c.Amount
                    })
                    .ToListAsync(cancellationToken);

                
                var debitDict = accountingEntries
                    .GroupBy(x => x.DebitId)
                    .ToDictionary(g => g.Key, g => g.Sum(x => x.Amount));

                var creditDict = accountingEntries
                    .GroupBy(x => x.CreditId)
                    .ToDictionary(g => g.Key, g => g.Sum(x => x.Amount));

            
                var accountIds = debitDict.Keys.Union(creditDict.Keys);

                var accountDtos = accountIds.Select(id => new TrialBalanceAccountDto
                {
                    AccountName = accountMap.GetValueOrDefault(id, "Unknown"),
                    DebitAmount = debitDict.TryGetValue(id, out var debitAmount) ? debitAmount : 0m,
                    CreditAmount = creditDict.TryGetValue(id, out var creditAmount) ? creditAmount : 0m
                }).ToList();

               
                var result = new TrialBalanceDto
                {
                    DebitTotalAmount = accountDtos.Sum(x => x.DebitAmount),
                    CreditTotalAmount = accountDtos.Sum(x => x.CreditAmount),
                    TrialBalanceAccounts = accountDtos
                };
                return ServiceResponse<TrialBalanceDto>.ReturnResultWith200(result);
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while getting trialBalance");
                return ServiceResponse<TrialBalanceDto>.Return500("error while getting trialBalance");
            }
        }
    }
}
