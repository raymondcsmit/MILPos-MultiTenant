using POS.Data.Entities.Accounts;
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting.Strategies;

public class ExpenseStrategy(
    IAccountingEntryFactory _entryFactory,
    ILedgerAccountRepository _ledgerAccountRepository,
    IAccountingEntryRepository _accountingEntryRepository,
    ITaxRepository _taxRepository
    ) : IExpenseStrategy
{


    public async Task ProcessTransactionAsync(POS.Data.Entities.Transaction transaction)
    {
        // Get required ledger accounts
        var expenseAccount = await _ledgerAccountRepository.GetByAccountCodeAsync("5300"); // General Expense
        var cashAccount = await _ledgerAccountRepository.GetByAccountCodeAsync("1050"); // Cash
        var creditorAccount = await _ledgerAccountRepository.GetByAccountCodeAsync("2100"); // Accounts Payable
        var inputGstAccount = await _ledgerAccountRepository.GetByAccountCodeAsync("1150"); // Input GST

        if (expenseAccount == null)
            throw new InvalidOperationException("Expense account not found");

        // Determine payment method (assume cash for now, could be parameterized)
        var creditAccountId = cashAccount?.Id ?? creditorAccount?.Id;
        if (creditAccountId == null)
            throw new InvalidOperationException("Payment account not found");

        // Main Expense Entry: Dr. Expense, Cr. Cash/Accounts Payable
        var mainEntry = await _entryFactory.CreateEntryAsync(
            transaction.Id,
            transaction.BranchId,
            expenseAccount.Id,
            creditAccountId.Value,
            transaction.SubTotal,
            $"Expense - {transaction.Narration}",
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
                    var taxAmount = (transaction.TotalAmount * gstAccount.TaxPercantage / 100);
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
                var gstEntry = await _entryFactory.CreateEntryAsync(
                    transaction.Id,
                    transaction.BranchId,
                    gstAccountId,
                    creditAccountId.Value,
                    totalAmount,
                    $"{accountName} on Expense - {transaction.Narration}",
                    transaction.ReferenceNumber,
                     transaction.FinancialYearId,
                    EntryType.Tax);

                _accountingEntryRepository.Add(gstEntry);
            }
        }
    }
}