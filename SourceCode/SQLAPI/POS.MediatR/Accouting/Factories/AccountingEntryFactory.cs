using POS.Data.Entities.Accounts;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace POS.MediatR;
public class AccountingEntryFactory : IAccountingEntryFactory
{
    public async Task<AccountingEntry> CreateEntryAsync(
       Guid transactionId,
       Guid branchId,
       Guid debitLedgerAccountId,
       Guid creditLedgerAccountId,
       decimal amount,
       string narration,
       string reference,
       Guid financialYearId,
       EntryType entryType = EntryType.Regular )
    {
        await Task.CompletedTask;

        return new AccountingEntry
        {
            TransactionId = transactionId,
            BranchId = branchId,
            DebitLedgerAccountId = debitLedgerAccountId,
            CreditLedgerAccountId = creditLedgerAccountId,
            Amount = amount,
            Narration = narration,
            Reference = reference,
            EntryDate = DateTime.UtcNow,
            FinancialYearId = financialYearId,  
            EntryType = entryType
        };
    }

    public async Task<IEnumerable<AccountingEntry>> CreateDoubleEntryAsync(
        Guid transactionId,
        Guid branchId,
        Guid debitLedgerAccountId,
        Guid creditLedgerAccountId,
        decimal amount,
        string narration,
        string reference,
        Guid financialYearId,
        EntryType entryType = EntryType.Regular)
    {
        var entries = new List<AccountingEntry>();

        // Debit Entry
        entries.Add(await CreateEntryAsync(
            transactionId, branchId, debitLedgerAccountId, creditLedgerAccountId,
            amount, narration, reference, financialYearId,entryType));

        return entries;
    }
}
