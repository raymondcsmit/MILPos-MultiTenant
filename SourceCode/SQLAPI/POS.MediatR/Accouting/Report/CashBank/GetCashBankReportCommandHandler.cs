using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Data.Dto.Acconting;
using POS.Data.Entities.Accounts;
using POS.Helper;
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
    public class GetCashBankReportCommandHandler(
        IAccountingEntryRepository _accountingEntryRepository,
        ILedgerAccountRepository _ledgerAccountRepository,
        IFinancialYearRepository _financialYearRepository,
        ILogger<GetProfitLossReportCommandHandler> _logger) : IRequestHandler<GetCashBankReportCommand, ServiceResponse<CashBankReReportDto>>
    {
        public async Task<ServiceResponse<CashBankReReportDto>> Handle(GetCashBankReportCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var financialYear = await _financialYearRepository.All.Where(c => c.Id == request.FinancialYearId).FirstOrDefaultAsync(cancellationToken);
                if (financialYear == null)
                {
                    return ServiceResponse<CashBankReReportDto>.Return404("Financial Year Not Found");
                }
                   
                var accounts = await _ledgerAccountRepository.All.Where(c => c.AccountCode == "1050" || c.AccountCode == "1060")
                    .ToDictionaryAsync(c => c.AccountCode, cancellationToken);

                var cashAccountId = accounts.TryGetValue("1050", out var inputParent) ? inputParent.Id : Guid.Empty;
                var bankAccountId = accounts.TryGetValue("1060", out var outputParent) ? outputParent.Id : Guid.Empty;

                // Base query with branch filter and FinancialYear Id
                var accountingQuery = _accountingEntryRepository.All
                    .Where(c => c.FinancialYearId == financialYear.Id).AsNoTracking();
                if (request.BranchId.HasValue)
                {
                    accountingQuery = accountingQuery.Where(c => c.BranchId == request.BranchId.Value);
                }
                var accountingEntries = await accountingQuery
                    .Where(c => (cashAccountId != Guid.Empty && (c.DebitLedgerAccountId == cashAccountId || c.CreditLedgerAccountId == cashAccountId)) ||
                     (bankAccountId != Guid.Empty && (c.DebitLedgerAccountId == bankAccountId || c.CreditLedgerAccountId == bankAccountId)))
                    .ToListAsync(cancellationToken);

                decimal cashTotal = 0;
                decimal bankTotal = 0;

                if (cashAccountId != Guid.Empty)
                {
                    var cashDebit = accountingEntries.Where(e => e.DebitLedgerAccountId == cashAccountId).Sum(e => e.Amount);
                    var cashCredit = accountingEntries.Where(e => e.CreditLedgerAccountId == cashAccountId).Sum(e => e.Amount);
                    cashTotal = cashDebit - cashCredit;
                }

                if (bankAccountId != Guid.Empty)
                {
                    var bankDebit = accountingEntries.Where(e => e.DebitLedgerAccountId == bankAccountId).Sum(e => e.Amount);
                    var bankCredit = accountingEntries.Where(e => e.CreditLedgerAccountId == bankAccountId).Sum(e => e.Amount);
                    bankTotal = bankDebit - bankCredit;
                }

                var cashBankDto = new CashBankReReportDto
                {
                    CashTotal = cashTotal,
                    BankTotal = bankTotal
                };
                return ServiceResponse<CashBankReReportDto>.ReturnResultWith200(cashBankDto);
            }
            catch(System.Exception ex)
            {
                _logger.LogError(ex,"error while getting CashBank Report");
                return ServiceResponse<CashBankReReportDto>.Return500("error while getting ");
            }
        }
    }
}
