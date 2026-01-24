using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting.Strategies;

public class SaleReturnStrategy(
      IAccountingEntryFactory _accountingEntryFactory,
    IAccountingEntryRepository _accountingEntryRepository,
    IProductRepository _productRepository,
    ILedgerAccountRepository ledgerAccountRepository,
    ITaxRepository _taxRepository) : ISaleReturnStrategy
{
    public async Task ProcessTransactionAsync(Transaction transaction)
    {
        // Get required ledger accounts
        var debtorAccount = await ledgerAccountRepository.GetByAccountCodeAsync("1100"); // Accounts Receivable
        var salesRevenueAccount = await ledgerAccountRepository.GetByAccountCodeAsync("4100"); // Sales Revenue
        var outputGstAccount = await ledgerAccountRepository.GetByAccountCodeAsync("2150"); // Output GST
        var inventoryAccount = await ledgerAccountRepository.GetByAccountCodeAsync("1200"); // Inventory
        var cogsAccount = await ledgerAccountRepository.GetByAccountCodeAsync("5100"); // Cost of Goods Sold
        var discountAccount = await ledgerAccountRepository.GetByAccountCodeAsync("5200"); // Discount Given
        var roundOffAccount = await ledgerAccountRepository.GetByAccountCodeAsync("5900"); // Round Off

        if (debtorAccount == null || salesRevenueAccount == null)
            throw new InvalidOperationException("Required ledger accounts not found");

        // Sales Return Entry: Dr. Sales Return, Cr. Accounts Receivable
        var mainEntry = await _accountingEntryFactory.CreateEntryAsync(
            transaction.Id,
            transaction.BranchId,
            salesRevenueAccount.Id,
            debtorAccount.Id,
            transaction.SubTotal,
            $"Sale Return - {transaction.Narration}",
            transaction.ReferenceNumber,
             transaction.FinancialYearId,
            EntryType.Regular);

        _accountingEntryRepository.Add(mainEntry);


        //OutPut GST Inner Tax Account  Entries
        var taxTotal = new Dictionary<Guid, (string AccountName, decimal TotalAmount)>();

        foreach (var item in transaction.TransactionItems)
        {
            foreach (var tax in item.TransactionItemTaxes)
            {
                var gstAccount = await _taxRepository.GetOutPutGstAccountAsync(tax.TaxId);
                if (gstAccount != null)
                {
                    var discount = item.DiscountType == "fixed" ? item.DiscountPercentage : (item.UnitPrice * item.Quantity) * item.DiscountPercentage / 100;
                    var taxAmount = (((item.UnitPrice * item.Quantity) - discount) * gstAccount.TaxPercantage / 100);

                    if (taxTotal.ContainsKey(gstAccount.LedgerAccount.Id))
                    {
                        var current = taxTotal[gstAccount.LedgerAccount.Id];
                        taxTotal[gstAccount.LedgerAccount.Id] =
                            (current.AccountName, current.TotalAmount + taxAmount);
                    }
                    else
                    {
                        taxTotal[gstAccount.LedgerAccount.Id] =
                            (gstAccount.LedgerAccount.AccountName, taxAmount);
                    }
                }
            }
        }
        foreach (var kvp in taxTotal)
        {
            var gstAccountId = kvp.Key;
            var accountName = kvp.Value.AccountName;
            var totalAmount = kvp.Value.TotalAmount;

            if (totalAmount > 0)
            {
                var gstEntry = await _accountingEntryFactory.CreateEntryAsync(
                    transaction.Id,
                    transaction.BranchId,
                    gstAccountId,
                    debtorAccount.Id,
                    totalAmount,
                    $"{accountName} on Sales Return - {transaction.Narration}",
                    transaction.ReferenceNumber,
                     transaction.FinancialYearId,
                    EntryType.Tax);

                _accountingEntryRepository.Add(gstEntry);
            }
        }


        // Reverse COGS Entry: Dr. Inventory, Cr. COGS
        if (cogsAccount != null && inventoryAccount != null)
        {
            var totalCogs = 0m;
            foreach (var item in transaction.TransactionItems)
            {
                //var inventoryItem = _productRepository.Find(item.InventoryItemId);
                //if (inventoryItem != null)
                //{ 
                totalCogs += item.Quantity * item.PurchasePrice;
                //}
            }

            if (totalCogs > 0)
            {
                var cogsEntry = await _accountingEntryFactory.CreateEntryAsync(
                    transaction.Id,
                    transaction.BranchId,
                    inventoryAccount.Id,
                    cogsAccount.Id,
                    totalCogs,
                    $"Reverse COGS for Sale Return - {transaction.Narration}",
                    transaction.ReferenceNumber,
                     transaction.FinancialYearId,
                    EntryType.Inventory);

                _accountingEntryRepository.Add(cogsEntry);
            }
        }
        // Discount Entry: CR. Discount Given, Dr. Sales Revenue
        if (transaction.DiscountAmount > 0 && salesRevenueAccount != null)
        {
            var discountEntry = await _accountingEntryFactory.CreateEntryAsync(
                transaction.Id,
                transaction.BranchId,
                salesRevenueAccount.Id,
                discountAccount.Id,
                transaction.DiscountAmount,
                $"Discount Reserve on Sale - {transaction.Narration}",
                transaction.ReferenceNumber,
                 transaction.FinancialYearId,
                EntryType.Discount);

            _accountingEntryRepository.Add(discountEntry);
        }

        // Round Off Entry
        if (transaction.RoundOffAmount != 0 && roundOffAccount != null)
        {
            var (debitAccount, creditAccount) = transaction.RoundOffAmount > 0
                ? (debtorAccount.Id, roundOffAccount.Id)
                : (roundOffAccount.Id, debtorAccount.Id);

            var roundOffEntry = await _accountingEntryFactory.CreateEntryAsync(
                transaction.Id,
                transaction.BranchId,
                debitAccount,
                creditAccount,
                Math.Abs(transaction.RoundOffAmount),
                $"Round Off on Sale - {transaction.Narration}",
                transaction.ReferenceNumber,
                 transaction.FinancialYearId,
                EntryType.RoundOff);

            _accountingEntryRepository.Add(roundOffEntry);
        }
    }
}