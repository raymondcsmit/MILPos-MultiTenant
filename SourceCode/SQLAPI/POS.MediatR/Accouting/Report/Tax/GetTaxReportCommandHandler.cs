using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Data.Dto.Acconting;
using POS.Helper;
using POS.Repository;
using POS.Repository.Accouting;

namespace POS.MediatR.Accouting
{
    public class GetTaxReportCommandHandler(
        IAccountingEntryRepository _accountingEntryRepository,
        ILedgerAccountRepository _ledgerAccountRepository,
        IFinancialYearRepository _financialYearRepository,
        ILogger<GetProfitLossReportCommandHandler> _logger) : IRequestHandler<GetTaxReportCommand, ServiceResponse<TaxReportDto>>
    {
        public async Task<ServiceResponse<TaxReportDto>> Handle(GetTaxReportCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var financialYear = await _financialYearRepository.All.Where(c => c.Id == request.FinancialYearId).FirstOrDefaultAsync(cancellationToken);
                if (financialYear == null)
                {
                    return ServiceResponse<TaxReportDto>.Return404("Financial Year Not Found");
                }

                var accountingQuery = _accountingEntryRepository.All
                   .Where(c => c.FinancialYearId == financialYear.Id).AsNoTracking();
                if (request.BranchId.HasValue)
                {
                    accountingQuery = accountingQuery.Where(c => c.BranchId == request.BranchId.Value);
                }

                var parentAccounts = await _ledgerAccountRepository.All
                    .Where(a => a.AccountCode == "1150" || a.AccountCode == "2150")
                    .Select(a => new { a.Id, a.AccountCode, a.AccountName })
                    .ToListAsync(cancellationToken);

                var inputParentId = parentAccounts.FirstOrDefault(a => a.AccountCode == "1150")?.Id ?? Guid.Empty;
                var outputParentId = parentAccounts.FirstOrDefault(a => a.AccountCode == "2150")?.Id ?? Guid.Empty;

                var childAccounts = await _ledgerAccountRepository.All
                    .Where(a => a.ParentAccountId == inputParentId || a.ParentAccountId == outputParentId)
                    .Select(a => new { a.Id, a.AccountName, a.ParentAccountId })
                    .ToListAsync(cancellationToken);

                var inputChildrenDict = childAccounts
                    .Where(a => a.ParentAccountId == inputParentId)
                    .ToDictionary(a => a.Id, a => a.AccountName);

                var outputChildrenDict = childAccounts
                    .Where(a => a.ParentAccountId == outputParentId)
                    .ToDictionary(a => a.Id, a => a.AccountName);

                var inputChildrenIds = inputChildrenDict.Keys.ToList();
                var outputChildrenIds = outputChildrenDict.Keys.ToList();

                var allTaxEntries = await accountingQuery
                    .Where(c => inputChildrenIds.Contains(c.DebitLedgerAccountId) ||
                                inputChildrenIds.Contains(c.CreditLedgerAccountId) ||
                                outputChildrenIds.Contains(c.DebitLedgerAccountId) ||
                                outputChildrenIds.Contains(c.CreditLedgerAccountId))
                    .Select(c => new
                    {
                        c.DebitLedgerAccountId,
                        c.CreditLedgerAccountId,
                        Amount = c.Amount
                    })
                    .ToListAsync(cancellationToken);

                var inputPurchases = allTaxEntries
                    .Where(x =>  inputChildrenIds.Contains(x.DebitLedgerAccountId))
                    .GroupBy(x => x.DebitLedgerAccountId)
                    .Select(g => new ChildTaxDto
                    {
                        TaxName = inputChildrenDict[g.Key],
                        Amount = g.Sum(x => x.Amount)
                    }).ToList();

                var inputReturns = allTaxEntries
                    .Where(x => inputChildrenIds.Contains(x.CreditLedgerAccountId))
                    .GroupBy(x => x.CreditLedgerAccountId)
                    .Select(g => new { ChildId = g.Key, Amount = g.Sum(x => x.Amount) })
                    .ToList();

                var inputGrossTotal = inputPurchases.Sum(x => x.Amount);
                var inputReturnTotal = inputReturns.Sum(x => x.Amount);
                var inputNetTotal = inputGrossTotal - inputReturnTotal;

                var outputSales = allTaxEntries
                    .Where(x =>  outputChildrenIds.Contains(x.CreditLedgerAccountId))
                    .GroupBy(x => x.CreditLedgerAccountId)
                    .Select(g => new ChildTaxDto
                    {
                        TaxName = outputChildrenDict[g.Key],
                        Amount = g.Sum(x => x.Amount)
                    }).ToList();

                var outputReturns = allTaxEntries
                    .Where(x => outputChildrenIds.Contains(x.DebitLedgerAccountId))
                    .GroupBy(x => x.DebitLedgerAccountId)
                    .Select(g => new { ChildId = g.Key, Amount = g.Sum(x => x.Amount) })
                    .ToList();

                var outputGrossTotal = outputSales.Sum(x => x.Amount);
                var outputReturnTotal = outputReturns.Sum(x => x.Amount);
                var outputNetTotal = outputGrossTotal - outputReturnTotal;

                var report = new TaxReportDto
                {
                    InputGstTotal = inputGrossTotal,
                    InputGstReturnTotal = inputReturnTotal,
                    OutputGstTotal = outputGrossTotal,
                    OutputGstReturnTotal = outputReturnTotal,
                    NetTaxPayable = outputNetTotal - inputNetTotal,
                    InputTaxes = inputPurchases,
                    OutputTaxes = outputSales
                };

                report.Status = report.NetTaxPayable switch
                {
                    > 0 => "Payable",
                    < 0 => "Refund",
                    _ => "Settled"
                };

                return ServiceResponse<TaxReportDto>.ReturnResultWith200(report);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while generating Tax Report");
                return ServiceResponse<TaxReportDto>.Return500("Error while generating Tax Report");
            }
        }
    }
}
