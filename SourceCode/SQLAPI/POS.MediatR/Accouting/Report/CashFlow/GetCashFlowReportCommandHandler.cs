using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto.Acconting.Report;
using POS.Helper;
using POS.Repository;
using POS.Repository.Accouting;

namespace POS.MediatR.Accouting.Report.CashFlow
{
    public class GetCashFlowReportCommandHandler(
        IAccountingEntryRepository _accountingEntryRepository,
        ILedgerAccountRepository _ledgerAccountRepository) : IRequestHandler<GetCashFlowReportCommand, ServiceResponse<CashFlowDto>>
    {
        public async Task<ServiceResponse<CashFlowDto>> Handle(GetCashFlowReportCommand request, CancellationToken cancellationToken)
        {
            var accounts = await _ledgerAccountRepository.All.ToListAsync(cancellationToken);

            var cashAccountIds = accounts.Where(a => a.AccountCode == "1050" || a.AccountCode == "1060").Select(a => a.Id).ToList();
            var accountNames = accounts.ToDictionary(a => a.Id, a => a.AccountName ?? "");
            var accountingQuery = _accountingEntryRepository.All.AsNoTracking();

            var startDate = request.FromDate.ToLocalTime();
            var endDate = request.ToDate.ToLocalTime();

            DateTime minDate = new DateTime(startDate.Year, startDate.Month, startDate.Day, 0, 0, 0);
            DateTime maxDate = new DateTime(endDate.Year, endDate.Month, endDate.Day, 23, 59, 59);

            if (request.LocationId.HasValue)
            {
                accountingQuery = accountingQuery.Where(c => c.BranchId == request.LocationId.Value);
            }


            var accountGroup = await accountingQuery
                .AsNoTracking()
                .Where(e =>
                    e.EntryDate >= minDate &&
                e.EntryDate <= maxDate &&
                (cashAccountIds.Contains(e.DebitLedgerAccountId) || cashAccountIds.Contains(e.CreditLedgerAccountId))
                )
               .GroupBy(e => new { e.DebitLedgerAccountId, e.CreditLedgerAccountId })
               .Select(g => new
               {
                   DebitId = g.Key.DebitLedgerAccountId,
                   CreditId = g.Key.CreditLedgerAccountId,
                   DebitAmount = g.Where(x => cashAccountIds.Contains(x.DebitLedgerAccountId)).Sum(x => x.Amount),
                   CreditAmount = g.Where(x => cashAccountIds.Contains(x.CreditLedgerAccountId)).Sum(x => x.Amount)
               }).ToListAsync(cancellationToken);
            var cashFlowAccountsDict = new Dictionary<Guid, CashFlowAccountDto>();

            foreach (var item in accountGroup)
            {
                // Cash Received Cash/Bank
                if (item.DebitAmount > 0 && cashAccountIds.Contains(item.DebitId))
                {
                    var accountId = item.CreditId;
                    var name = accountNames.GetValueOrDefault(accountId, "Unknown");

                    if (!cashFlowAccountsDict.TryGetValue(accountId, out var dto))
                    {
                        dto = new CashFlowAccountDto { AccountName = name };
                        cashFlowAccountsDict[accountId] = dto;
                    }

                    dto.DebitAmount += item.DebitAmount;
                }

                // Cash Paid   Cash/Bank
                if (item.CreditAmount > 0 && cashAccountIds.Contains(item.CreditId))
                {
                    var accountId = item.DebitId;
                    var name = accountNames.GetValueOrDefault(accountId, "Unknown");

                    if (!cashFlowAccountsDict.TryGetValue(accountId, out var dto))
                    {
                        dto = new CashFlowAccountDto { AccountName = name };
                        cashFlowAccountsDict[accountId] = dto;
                    }

                    dto.CreditAmount += item.CreditAmount;
                }
            }

            decimal totalCashReceived = cashFlowAccountsDict.Values.Sum(x => x.DebitAmount);
            decimal totalCashPaid = cashFlowAccountsDict.Values.Sum(x => x.CreditAmount);

            var cashFlowDto = new CashFlowDto
            {
                TotalCashRecived = totalCashReceived,
                TotalCashPaid = totalCashPaid,
                NetTotalMovement = totalCashReceived - totalCashPaid,
                cashFlowAccounts = cashFlowAccountsDict.Values.ToList()
            };

            return ServiceResponse<CashFlowDto>.ReturnResultWith200(cashFlowDto);
        }
    }
}
