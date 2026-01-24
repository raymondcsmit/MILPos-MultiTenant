using POS.Data.Entities.Accounts;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace POS.MediatR;
public interface IAccountingEntryFactory
{
    Task<AccountingEntry> CreateEntryAsync(
        Guid transactionId,
        Guid branchId,
        Guid debitLedgerAccountId,
        Guid creditLedgerAccountId,
        decimal amount,
        string narration,
        string reference,
         Guid financialYearId,
        EntryType entryType = EntryType.Regular
       );

    Task<IEnumerable<AccountingEntry>> CreateDoubleEntryAsync(
        Guid transactionId,
        Guid branchId,
        Guid debitLedgerAccountId,
        Guid creditLedgerAccountId,
        decimal amount,
        string narration,
        string reference,
        Guid financialYearId,
        EntryType entryType = EntryType.Regular);
}
