using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data.Dto.Acconting.Report;
using POS.Data.Entities.Accounts;
using POS.Data.Resources;
using POS.Domain;
using POS.Repository.Accouting;

namespace POS.Repository;
public class AccountingEntryRepository : GenericRepository<AccountingEntry, POSDbContext>,
          IAccountingEntryRepository
{
    private readonly ILedgerAccountRepository _ledgerAccountRepository;
    private readonly IPropertyMappingService _propertyMappingService;
    public AccountingEntryRepository(
        IUnitOfWork<POSDbContext> uow
        , ILedgerAccountRepository ledgerAccountRepository,
IPropertyMappingService propertyMappingService) : base(uow)
    {
        _ledgerAccountRepository = ledgerAccountRepository;
        _propertyMappingService = propertyMappingService;
    }

    public async Task<IEnumerable<AccountingEntry>> GetByTransactionIdAsync(Guid transactionId)
    {
        return await All
            .Where(ae => ae.TransactionId == transactionId)
            .Include(ae => ae.DebitLedgerAccount)
            .Include(ae => ae.CreditLedgerAccount)
            .ToListAsync();
    }

    public async Task<IEnumerable<AccountingEntry>> GetByBranchIdAsync(Guid branchId)
    {
        return await All
            .Where(ae => ae.BranchId == branchId)
            .Include(ae => ae.Transaction)
            .Include(ae => ae.DebitLedgerAccount)
            .Include(ae => ae.CreditLedgerAccount)
            .ToListAsync();
    }

    public async Task<IEnumerable<AccountingEntry>> GetByDateRangeAsync(DateTime fromDate, DateTime toDate, Guid? branchId = null)
    {
        var query = All.Where(ae => ae.EntryDate >= fromDate && ae.EntryDate <= toDate);

        if (branchId.HasValue)
        {
            query = query.Where(ae => ae.BranchId == branchId.Value);
        }

        return await query
            .Include(ae => ae.Transaction)
            .Include(ae => ae.DebitLedgerAccount)
            .Include(ae => ae.CreditLedgerAccount)
            .ToListAsync();
    }

    public async Task<decimal> GetLedgerBalanceAsync(Guid ledgerAccountId, Guid branchId)
    {
        var debitTotal = await All
            .Where(ae => ae.DebitLedgerAccountId == ledgerAccountId && ae.BranchId == branchId)
            .SumAsync(ae => ae.Amount);

        var creditTotal = await All
            .Where(ae => ae.CreditLedgerAccountId == ledgerAccountId && ae.BranchId == branchId)
            .SumAsync(ae => ae.Amount);

        return debitTotal - creditTotal;
    }

    public async Task<AccountingEntryList> GetAccountingEntryList(GeneralEntryResource generalEntryResource)
    {
        var collectionBeforePaging = All
                                    .Include(c => c.Transaction).Include(c=>c.DebitLedgerAccount).Include(c=>c.CreditLedgerAccount)
                                    .AsQueryable();
        if (generalEntryResource.FinancialYearId.HasValue)
        {
            collectionBeforePaging = collectionBeforePaging.Where(c => c.FinancialYearId == generalEntryResource.FinancialYearId.Value);
        }
        if (generalEntryResource.BranchId.HasValue)
        {
            collectionBeforePaging = collectionBeforePaging.Where(c => c.BranchId == generalEntryResource.BranchId.Value);
        }
        if (generalEntryResource.TransactionType.HasValue)
        {
            collectionBeforePaging = collectionBeforePaging.Where(c => c.Transaction.TransactionType == generalEntryResource.TransactionType.Value);
        }
        if (generalEntryResource.FromDate.HasValue && generalEntryResource.ToDate.HasValue)
        {
            var startDate = generalEntryResource.FromDate.Value.ToLocalTime();
            var endDate = generalEntryResource.ToDate.Value.ToLocalTime();

            DateTime minDate = new DateTime(startDate.Year, startDate.Month, startDate.Day, 0, 0, 0);
            DateTime maxDate = new DateTime(endDate.Year, endDate.Month, endDate.Day, 23, 59, 59);

            collectionBeforePaging = collectionBeforePaging
                        .Where(c => c.CreatedDate >= minDate &&
                            c.CreatedDate <= maxDate);
        }
        // Apply sorting if needed
        collectionBeforePaging = collectionBeforePaging.ApplySort(
            generalEntryResource.OrderBy,
            _propertyMappingService.GetPropertyMapping<GeneralEntryDto, AccountingEntry>()
        );
        if (!string.IsNullOrWhiteSpace(generalEntryResource.TransactionNumber))
        {
            collectionBeforePaging = collectionBeforePaging
                .Where(c => c.Transaction.TransactionNumber.Contains(generalEntryResource.TransactionNumber));
        }
        var accountingEntryList = new AccountingEntryList(_ledgerAccountRepository);
        return await accountingEntryList.Create(
        collectionBeforePaging,
        generalEntryResource.Skip,
        generalEntryResource.PageSize);
    }
}
