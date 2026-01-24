using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting.Strategies;

public class PurchaseStrategy(
     IAccountingEntryFactory _accountingEntryFactory,
    IAccountingEntryRepository _accountingEntryRepository,
    ILedgerAccountRepository ledgerAccountRepository,
    ITaxRepository _taxRepository) : IPurchaseStrategy
{

    public async Task ProcessTransactionAsync(Transaction transaction)
    {
        // Get required ledger accounts
        var inventoryAccount = await ledgerAccountRepository.GetByAccountCodeAsync("1200"); // Inventory
        var creditorAccount = await ledgerAccountRepository.GetByAccountCodeAsync("2100"); // Accounts Payable
        var inputGstAccount = await ledgerAccountRepository.GetByAccountCodeAsync("1150"); // Input GST
        var discountAccount = await ledgerAccountRepository.GetByAccountCodeAsync("4200"); // Discount Received
        var roundOffAccount = await ledgerAccountRepository.GetByAccountCodeAsync("5900"); // Round Off

        if (inventoryAccount == null || creditorAccount == null)
            throw new InvalidOperationException("Required ledger accounts not found");

        // Main Purchase Entry: Dr. Inventory, Cr. Accounts Payable
        var mainEntry = await _accountingEntryFactory.CreateEntryAsync(
            transaction.Id,
            transaction.BranchId,
            inventoryAccount.Id,
            creditorAccount.Id,
            transaction.SubTotal,
            $"Purchase - {transaction.Narration}",
            transaction.ReferenceNumber,
             transaction.FinancialYearId,
            EntryType.Regular);

        _accountingEntryRepository.Add(mainEntry);

        // Input GST inner Tax Entries
        var taxTotal = new Dictionary<Guid, (string AccountName, decimal TotalAmount)>();

        foreach (var item in transaction.TransactionItems)
        {
            foreach (var tax in item.TransactionItemTaxes)
            {
                var gstAccount = await _taxRepository.GetInputGstAccountCodeAsync(tax.TaxId);
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
                    creditorAccount.Id,
                    totalAmount,
                    $"{accountName} on Purchase - {transaction.Narration}",
                    transaction.ReferenceNumber,
                     transaction.FinancialYearId,
                    EntryType.Tax);

                _accountingEntryRepository.Add(gstEntry);
            }
        }

        // Discount Entry: Dr. Accounts Payable, Cr. Discount Received
        if (transaction.DiscountAmount > 0 && discountAccount != null)
        {
            var discountEntry = await _accountingEntryFactory.CreateEntryAsync(
                transaction.Id,
                transaction.BranchId,
                creditorAccount.Id,
                discountAccount.Id,
                transaction.DiscountAmount,
                $"Discount on Purchase - {transaction.Narration}",
                transaction.ReferenceNumber,
                 transaction.FinancialYearId,
                EntryType.Discount);

            _accountingEntryRepository.Add(discountEntry);
        }

        // Round Off Entry
        if (transaction.RoundOffAmount != 0 && roundOffAccount != null)
        {
            var (debitAccount, creditAccount) = transaction.RoundOffAmount > 0
                ? (creditorAccount.Id, roundOffAccount.Id)
                : (roundOffAccount.Id, creditorAccount.Id);

            var roundOffEntry = await _accountingEntryFactory.CreateEntryAsync(
                transaction.Id,
                transaction.BranchId,
                debitAccount,
                creditAccount,
                Math.Abs(transaction.RoundOffAmount),
                $"Round Off on Purchase - {transaction.Narration}",
                transaction.ReferenceNumber,
                 transaction.FinancialYearId,
                EntryType.RoundOff);

            _accountingEntryRepository.Add(roundOffEntry);
        }
    }
}