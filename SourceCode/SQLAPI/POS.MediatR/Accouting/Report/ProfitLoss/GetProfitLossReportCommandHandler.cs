using Amazon.Runtime.Internal.Util;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Data.Dto.Acconting;
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
    public class GetProfitLossReportCommandHandler(
        IAccountingEntryRepository _accountingEntryRepository,
        ILedgerAccountRepository _ledgerAccountRepository,
        IFinancialYearRepository  _financialYearRepository,
        ILogger<GetProfitLossReportCommandHandler> _loggger) : IRequestHandler<GetProfitLossReportCommand, ServiceResponse<ProfitLossDataDto>>
    {
        public async Task<ServiceResponse<ProfitLossDataDto>> Handle(GetProfitLossReportCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var financialYear = await _financialYearRepository.All.Where(c => c.Id == request.FinancialYearId).FirstOrDefaultAsync(cancellationToken);
                if (financialYear == null)
                {
                    return ServiceResponse<ProfitLossDataDto>.Return404("Financial Year Not Found");
                }
                var profitLossDto = new ProfitLossDataDto();

                var accounts = await _ledgerAccountRepository.All
                    .Where(c => c.AccountCode == "4100" || c.AccountCode == "5100" || c.AccountCode == "5300")
                    .ToDictionaryAsync(c => c.AccountCode, cancellationToken);

                var salesAccountId = accounts.TryGetValue("4100", out var salesAcc) ? salesAcc.Id : Guid.Empty;
                var cogsAccountId = accounts.TryGetValue("5100", out var cogsAcc) ? cogsAcc.Id : Guid.Empty;
                var expenseAccountId = accounts.TryGetValue("5300", out var expAcc) ? expAcc.Id : Guid.Empty;

               
                var accountingQuery = _accountingEntryRepository.All
                    .Where(c => c.FinancialYearId == financialYear.Id).AsNoTracking();
                if (request.BranchId.HasValue)
                {
                    accountingQuery = accountingQuery.Where(c => c.BranchId == request.BranchId.Value);
                }
                var accountingEntries= await accountingQuery.Select(c => new
                {
                    c.CreditLedgerAccountId,
                    c.DebitLedgerAccountId,
                    c.Amount
                }).ToListAsync();
                // sales & sales Return
                var salesRevenueTotal = accountingEntries
                    .Where(c => c.CreditLedgerAccountId == salesAccountId)
                    .Sum(c => c.Amount);

                var salesReturnTotal =  accountingEntries
                    .Where(c => c.DebitLedgerAccountId == salesAccountId )
                    .Sum(c => c.Amount);


                //cogs & cogs return
                var cogsTotal = accountingEntries
                    .Where(c => c.DebitLedgerAccountId == cogsAccountId )
                    .Sum(c => c.Amount);

                var cogsReturnTotal = accountingEntries
                    .Where(c => c.CreditLedgerAccountId == cogsAccountId )
                    .Sum(c => c.Amount);

                //Expense Total
                var expenseTotal = accountingEntries
                    .Where(c => c.DebitLedgerAccountId == expenseAccountId)
                    .Sum(c => c.Amount);

                //Gross Profit
                profitLossDto.GrossProfit = (salesRevenueTotal - salesReturnTotal) - (cogsTotal - cogsReturnTotal);
                profitLossDto.NetResult = profitLossDto.GrossProfit - expenseTotal;

                profitLossDto.ProfitOrLoss = profitLossDto.NetResult switch
                {
                    > 0 => "Profit",
                    < 0 => "Loss",
                    _ => "Break-even"
                };

                profitLossDto.SalesRevenue = salesRevenueTotal;
                profitLossDto.SalesReturn = salesReturnTotal;
                profitLossDto.COGS = cogsTotal;
                profitLossDto.COGSReturn = cogsReturnTotal;
                profitLossDto.Expense = expenseTotal;
                return ServiceResponse<ProfitLossDataDto>.ReturnResultWith200(profitLossDto);
            }
            catch (System.Exception ex) 
            {
                _loggger.LogError(ex, "error while getting profit loss report");
                return ServiceResponse<ProfitLossDataDto>.Return500("error while getting ProfitLoss Report");
            }
        }
    }
}
