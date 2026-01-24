using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Data.Dto;
using POS.Data.Dto.Acconting;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Data.Resources;
using POS.Helper;
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting
{
    public class GetDailySaleReportCommandHandler(
        ITransactionRepository _transactionRepository,
        IAccountingEntryRepository _accountingEntryRepository,
        ILedgerAccountRepository _ledgerAccountRepository,
        ISalesOrderItemRepository _salesOrderItemRepository,
        ILogger<GetDailySaleReportCommandHandler> _logger,
        IUserRepository _userRepository,
        IUserLocationsRepository _userLocationsRepository,
        UserInfoToken userInfoToken,
        ISalesOrderRepository _salesOrderRepository) : IRequestHandler<GetDailySaleReportCommand, ServiceResponse<DailySaleReportDto>>
    {
        public async Task<ServiceResponse<DailySaleReportDto>> Handle(GetDailySaleReportCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var utcDate = request.DailyReportDate.ToUniversalTime();

                DateTime minDate = utcDate;
                DateTime maxDate = utcDate.AddDays(1).AddTicks(-1);

                var transactionQuery = _transactionRepository.All;
                var accountingQuery = _accountingEntryRepository.All;
                var salesorderQuery = _salesOrderRepository.All.Where(c => c.SOCreatedDate >= minDate && c.SOCreatedDate <= maxDate);

                var salesOrderItemQuery = _salesOrderItemRepository.All;

                var user = await _userRepository.All.Where(c => c.Id == userInfoToken.Id).FirstOrDefaultAsync();

                if (user != null && !user.IsAllLocations)
                {
                    var userLocationIds = await _userLocationsRepository.All.Where(c => c.UserId == user.Id).Select(c => c.LocationId).ToListAsync();

                    transactionQuery = transactionQuery.Where(c => userLocationIds.Contains(c.BranchId));
                    accountingQuery = accountingQuery.Where(c => userLocationIds.Contains(c.BranchId));

                    var salesorderIds = await salesorderQuery.Where(c => userLocationIds.Contains(c.LocationId)).Select(c => c.Id).ToListAsync();
                    salesOrderItemQuery = salesOrderItemQuery.Where(c => salesorderIds.Contains(c.SalesOrderId));
                }
                else
                {
                    var salesorderIds = await salesorderQuery.Select(c => c.Id).ToListAsync();
                    salesOrderItemQuery = salesOrderItemQuery.Where(c => salesorderIds.Contains(c.SalesOrderId));
                }

                var transactionCounts = await transactionQuery
                .Where(c => c.TransactionDate >= minDate && c.TransactionDate <= maxDate)
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    SaleCount = g.Count(c => c.TransactionType == Data.Entities.Accounts.TransactionType.Sale),
                    SaleReturnCount = g.Count(c => c.TransactionType == Data.Entities.Accounts.TransactionType.SaleReturn)
                }).FirstOrDefaultAsync(cancellationToken);

                var saleCount = transactionCounts?.SaleCount ?? 0;
                var saleReturnCount = transactionCounts?.SaleReturnCount ?? 0;
                // 1100 Accounts Receivable 
                // 5200 Discount Given
                var ledgerAccounts = await _ledgerAccountRepository.All
                    .Where(c => c.AccountCode == "1100" || c.AccountCode == "5200").ToListAsync(cancellationToken);

                var accountRecievable = ledgerAccounts.Where(c => c.AccountCode == "1100").FirstOrDefault();
                var discountGiven = ledgerAccounts.Where(c => c.AccountCode == "5200").FirstOrDefault();


                var totalsEntries = await accountingQuery
                    .Where(c => (
                    c.DebitLedgerAccountId == accountRecievable.Id ||
                    c.CreditLedgerAccountId == accountRecievable.Id ||
                    c.DebitLedgerAccountId == discountGiven.Id ||
                    c.CreditLedgerAccountId == discountGiven.Id)
                    && c.EntryDate >= minDate && c.EntryDate <= maxDate)
                    .Select(c => new
                    {
                        c.DebitLedgerAccountId,
                        c.CreditLedgerAccountId,
                        c.Narration,
                        c.EntryType,
                        c.Amount
                    })
                    .ToListAsync();
                // * Debit - Credit

                // GrossSales (Item * Qty)
                var recievableDebit = totalsEntries.Where(c => c.DebitLedgerAccountId == accountRecievable.Id && c.EntryType == EntryType.Regular && !c.Narration.ToUpper().Contains("PAYMENT")).Sum(c => c.Amount);

                var recievableCredit = totalsEntries.Where(c => c.CreditLedgerAccountId == accountRecievable.Id && c.EntryType == EntryType.Regular && !c.Narration.ToUpper().Contains("PAYMENT")).Sum(c => c.Amount);
                var grossSales = recievableDebit - recievableCredit;

                // NetSales
                var discountDebit = totalsEntries.Where(c => c.DebitLedgerAccountId == discountGiven.Id).Sum(c => c.Amount);
                var discountCredit = totalsEntries.Where(c => c.CreditLedgerAccountId == discountGiven.Id).Sum(c => c.Amount);
                var discounts = discountDebit - discountCredit;

                // TaxAbleAmount
                var taxableAmount = grossSales - discounts;

                var totalTaxDebit = totalsEntries.Where(c => c.DebitLedgerAccountId == accountRecievable.Id && c.EntryType == EntryType.Tax).Sum(c => c.Amount);
                var totalTaxCredit = totalsEntries.Where(c => c.CreditLedgerAccountId == accountRecievable.Id && c.EntryType == EntryType.Tax).Sum(c => c.Amount);
                // Total = debit - credit
                var totalTax = totalTaxDebit - totalTaxCredit;

                var netSales = taxableAmount + totalTax;

                var itemCount = await salesOrderItemQuery
                    .GroupBy((_ => 1))
                    .Select(c => new
                    {
                        count = c.Count(s => s.Status == PurchaseSaleItemStatusEnum.Not_Return),
                        returnCount = c.Count(s => s.Status == PurchaseSaleItemStatusEnum.Return)
                    }).FirstOrDefaultAsync();


                decimal avgSale = saleCount == 0 ? 0 : netSales / saleCount;
                var dailySaleReportDto = new DailySaleReportDto
                {
                    TransactionCount = saleCount + saleReturnCount,
                    GrossSales = grossSales,
                    TaxableAmount = taxableAmount,
                    TotalTax = totalTax,
                    NetSales = netSales,
                    Discounts = discounts,
                    AverageSale = avgSale,
                    ItemsReturn = itemCount != null ? itemCount.returnCount : 0,
                    ItemsSoldCount = itemCount != null ? itemCount.count : 0
                };

                return ServiceResponse<DailySaleReportDto>.ReturnResultWith200(dailySaleReportDto);
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while geting dailySales report");
                return ServiceResponse<DailySaleReportDto>.Return500("error while geting dailySales report");
            }

        }
    }
}
