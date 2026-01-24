using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting.Strategies;

public class StockAdjustmentStrategy(
    IAccountingEntryFactory _accountingEntryFactory,
    IAccountingEntryRepository _accountingEntryRepository,
    ILedgerAccountRepository ledgerAccountRepository,
    ITaxRepository _taxRepository) : IStockAdjustmentStrategy
{

    public async Task ProcessTransactionAsync(Transaction transaction)
    {
        // Get required ledger accounts
        var inventoryAccount = await ledgerAccountRepository.GetByAccountCodeAsync("1200"); // Inventory
        var stockAdjustmentAccount = await ledgerAccountRepository.GetByAccountCodeAsync("5400"); // Stock Adjustment
        var creditorAccount = await ledgerAccountRepository.GetByAccountCodeAsync("2100"); // Accounts Payable
        var inputGstAccount = await ledgerAccountRepository.GetByAccountCodeAsync("1150"); // Input GST

        if (inventoryAccount == null || stockAdjustmentAccount == null)
            throw new InvalidOperationException("Required ledger accounts not found for stock adjustment");

        // Determine if it's a gain or loss based on transaction amount and narration
        var isGain = transaction.Narration.Contains("Gain", StringComparison.OrdinalIgnoreCase);

        AccountingEntry adjustmentEntry;


        if (isGain)
        {
            // Stock Gain: Dr. Inventory, Cr. Stock Adjustment (Income)
            adjustmentEntry = await _accountingEntryFactory.CreateEntryAsync(
                transaction.Id,
                transaction.BranchId,
                inventoryAccount.Id,
                stockAdjustmentAccount.Id,
                transaction.TotalAmount,
                $"Stock Gain - {transaction.Narration}",
                transaction.ReferenceNumber,
                 transaction.FinancialYearId,
                EntryType.Regular);

           
            // Input GST inner Tax Entries
            var taxTotal = new Dictionary<Guid, (string AccountName, decimal TotalAmount)>();

            foreach (var item in transaction.TransactionItems)
            {
                foreach (var tax in item.TransactionItemTaxes)
                {
                    var gstAccount = await _taxRepository.GetInputGstAccountCodeAsync(tax.TaxId);
                    if (gstAccount != null)
                    {
                        var taxAmount = ((item.UnitPrice * item.Quantity) * gstAccount.TaxPercantage / 100);

                            taxTotal[gstAccount.LedgerAccount.Id] =
                                (gstAccount.LedgerAccount.AccountName, taxAmount);
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
                        $"{accountName} on Stock Gain - {transaction.Narration}",
                        transaction.ReferenceNumber,
                         transaction.FinancialYearId,
                        EntryType.Tax);

                    _accountingEntryRepository.Add(gstEntry);
                }
            }
        }
        else
        {
            // Stock Loss: Dr. Stock Adjustment (Expense), Cr. Inventory
            adjustmentEntry = await _accountingEntryFactory.CreateEntryAsync(
                transaction.Id,
                transaction.BranchId,
                stockAdjustmentAccount.Id,
                inventoryAccount.Id,
                transaction.TotalAmount,
                $"Stock Loss - {transaction.Narration}",
                transaction.ReferenceNumber,
                 transaction.FinancialYearId,
                EntryType.Regular);
        }

        _accountingEntryRepository.Add(adjustmentEntry);
    }
}