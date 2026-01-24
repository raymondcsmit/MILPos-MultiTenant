using Amazon.Runtime.Internal.Util;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Data.Dto;
using POS.Data.Dto.Acconting;
using POS.Data.Entities;
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
    public class GetDailyPurchaseReportCommandHandler(
        ITransactionRepository _transactionRepository,
        IAccountingEntryRepository _accountingEntryRepository,
        ILedgerAccountRepository _ledgerAccountRepository,
        IPurchaseOrderItemRepository _purchaseOrderItemRepository,
        ILogger<GetDailyPurchaseReportCommandHandler> _logger,
        IUserRepository _userRepository,
        IUserLocationsRepository _userLocationsRepository,
        UserInfoToken userInfoToken,
        IPurchaseOrderRepository _purchaseOrderRepository) : IRequestHandler<GetDailyPurchaseReportCommand, ServiceResponse<DailyPurchaseReportDto>>
    {
        public async Task<ServiceResponse<DailyPurchaseReportDto>> Handle(GetDailyPurchaseReportCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var utcDate = request.DailyReportDate.ToUniversalTime();

                DateTime minDate = utcDate;
                DateTime maxDate = utcDate.AddDays(1).AddTicks(-1);

                var transactionQuery = _transactionRepository.All;
                var accountingQuery = _accountingEntryRepository.All;
                var purchaseOrderQuery = _purchaseOrderRepository.All.Where(c => c.POCreatedDate >= minDate && c.POCreatedDate <= maxDate);
                var purchaseOrderItemQuery = _purchaseOrderItemRepository.All;
                var user = await _userRepository.All.Where(c => c.Id == userInfoToken.Id).FirstOrDefaultAsync();
                if (user != null && !user.IsAllLocations)
                {
                    var userLocationIds = await _userLocationsRepository.All.Where(c => c.UserId == user.Id).Select(c => c.LocationId).ToListAsync();

                    transactionQuery = transactionQuery.Where(c => userLocationIds.Contains(c.BranchId));
                    accountingQuery = accountingQuery.Where(c => userLocationIds.Contains(c.BranchId));

                    var purchaseOrderIds = await _purchaseOrderRepository.All.Where(
                        c => userLocationIds.Contains(c.LocationId)).Select(c => c.Id).ToListAsync();
                    purchaseOrderItemQuery = purchaseOrderItemQuery.Where(c => purchaseOrderIds.Contains(c.PurchaseOrderId));
                }
                else
                {
                    var purchaseOrderIds = await purchaseOrderQuery.Select(c => c.Id).ToListAsync();
                    purchaseOrderItemQuery = purchaseOrderItemQuery.Where(c => purchaseOrderIds.Contains(c.PurchaseOrderId));
                }

                var transactionCounts = await transactionQuery
                .Where(c => c.TransactionDate >= minDate && c.TransactionDate <= maxDate)
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    PurchaseCount = g.Count(c => c.TransactionType == TransactionType.Purchase),
                    PurchaseReturnCount = g.Count(c => c.TransactionType == TransactionType.PurchaseReturn)
                }).FirstOrDefaultAsync(cancellationToken);

                var purchaseCount = transactionCounts?.PurchaseCount ?? 0;
                var purchaseReturnCount = transactionCounts?.PurchaseReturnCount ?? 0;
                // 2100 Accounts Receivable 
                // 4200 Discount Received
                var ledgerAccounts = await _ledgerAccountRepository.All
                    .Where(c => c.AccountCode == "2100" || c.AccountCode == "4200").ToListAsync(cancellationToken);

                var accountPayable = ledgerAccounts.Where(c => c.AccountCode == "2100").FirstOrDefault();
                var discountReceived = ledgerAccounts.Where(c => c.AccountCode == "4200").FirstOrDefault();

                var totalsEntries = await accountingQuery
                   .Where(c => (
                    c.CreditLedgerAccountId == accountPayable.Id ||
                    c.DebitLedgerAccountId == accountPayable.Id ||
                    c.CreditLedgerAccountId == discountReceived.Id ||
                    c.DebitLedgerAccountId == discountReceived.Id)
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

                // * Credit - Debit

                // GrossPurchase
                var payableCredit = totalsEntries.Where(c => c.CreditLedgerAccountId == accountPayable.Id && c.EntryType == EntryType.Regular && !c.Narration.ToUpper().Contains("PAYMENT")).Sum(c => c.Amount);
                var payableDebit = totalsEntries.Where(c => c.DebitLedgerAccountId == accountPayable.Id && c.EntryType == EntryType.Regular && !c.Narration.ToUpper().Contains("PAYMENT")).Sum(c => c.Amount);

                var grossPurchase = payableCredit - payableDebit;

                // NetPurchase
                var discountCredit = totalsEntries.Where(c => c.CreditLedgerAccountId == discountReceived.Id).Sum(c => c.Amount);
                var discountDebit = totalsEntries.Where(c => c.DebitLedgerAccountId == discountReceived.Id).Sum(c => c.Amount);

                var discounts = discountCredit - discountDebit;
                // TaxAbleAmount
                var taxableAmount = grossPurchase - discounts;
                // Total Tax
                var totalTaxDebit = totalsEntries.Where(c => c.DebitLedgerAccountId == accountPayable.Id && c.EntryType == EntryType.Tax).Sum(c => c.Amount);
                var totalTaxCredit = totalsEntries.Where(c => c.CreditLedgerAccountId == accountPayable.Id && c.EntryType == EntryType.Tax).Sum(c => c.Amount);
                
                var totalTax = totalTaxCredit - totalTaxDebit;

                var netPurchase = taxableAmount  + totalTax;

                var itemCount = await purchaseOrderItemQuery
                    .Where(c => c.CreatedDate >= minDate && c.CreatedDate <= maxDate)
                    .GroupBy((_ => 1))
                    .Select(c => new
                    {
                        count = c.Count(s => s.Status == PurchaseSaleItemStatusEnum.Not_Return),
                        returnCount = c.Count(s => s.Status == PurchaseSaleItemStatusEnum.Return)
                    }).FirstOrDefaultAsync();

                decimal avgPurchase = purchaseCount == 0 ? 0 : netPurchase / purchaseCount;

                var dailyPurchaseReportDto = new DailyPurchaseReportDto
                {
                    TransactionCount = purchaseCount + purchaseReturnCount,
                    GrossPurchase = grossPurchase,
                    TaxableAmount = taxableAmount,
                    TotalTax = totalTax,
                    NetPurchase = netPurchase,
                    Discounts = discounts,
                    AveragePurchase = avgPurchase,
                    ItemsReturn = itemCount != null ? itemCount.returnCount : 0,
                    PurchasedItemsCount = itemCount != null ? itemCount.count : 0
                };
                return ServiceResponse<DailyPurchaseReportDto>.ReturnResultWith200(dailyPurchaseReportDto);

            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while geting dailyPurchase report");
                return ServiceResponse<DailyPurchaseReportDto>.Return500("error while geting dailyPurchase report");
            }
        }
    }
}
