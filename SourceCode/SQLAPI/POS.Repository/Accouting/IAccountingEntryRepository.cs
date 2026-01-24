using POS.Common.GenericRepository;
using POS.Data.Dto;
using POS.Data.Entities.Accounts;
using POS.Data.Resources;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace POS.Repository;
public interface IAccountingEntryRepository : IGenericRepository<AccountingEntry>
{
    Task<IEnumerable<AccountingEntry>> GetByTransactionIdAsync(Guid transactionId);

    Task<IEnumerable<AccountingEntry>> GetByBranchIdAsync(Guid branchId);

    Task<IEnumerable<AccountingEntry>> GetByDateRangeAsync(DateTime fromDate, DateTime toDate, Guid? branchId = null);

    Task<decimal> GetLedgerBalanceAsync(Guid ledgerAccountId, Guid branchId);

    Task<AccountingEntryList> GetAccountingEntryList(GeneralEntryResource generalEntryResource);

}
 