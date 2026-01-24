using Microsoft.EntityFrameworkCore;
using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data.Dto;
using POS.Data.Dto.Acconting;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Data.Resources;
using POS.Domain;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;

namespace POS.Repository;
public class TransactionRepository(IUnitOfWork<POSDbContext> uow, UserInfoToken _userInfoToken,
IPropertyMappingService _propertyMappingService) : GenericRepository<Transaction, POSDbContext>(uow),
          ITransactionRepository
{

    public async Task<Transaction?> GetByTransactionNumberAsync(string transactionNumber)
    {
        return await All
            .Include(t => t.TransactionItems)
            .ThenInclude(ti => ti.InventoryItem)
            .Include(t => t.AccountingEntries)
            .Include(t => t.TaxEntries)
            .FirstOrDefaultAsync(t => t.TransactionNumber == transactionNumber);
    }

    public async Task<IEnumerable<Transaction>> GetByBranchIdAsync(Guid branchId)
    {
        return await All
            .Where(t => t.BranchId == branchId)
            .Include(t => t.TransactionItems)
            .ToListAsync();
    }

    public async Task<IEnumerable<Transaction>> GetByTransactionTypeAsync(TransactionType transactionType, Guid? branchId = null)
    {
        var query = All.Where(t => t.TransactionType == transactionType);

        if (branchId.HasValue)
        {
            query = query.Where(t => t.BranchId == branchId.Value);
        }

        return await query
            .Include(t => t.TransactionItems)
            .ToListAsync();
    }

    public async Task<Transaction?> GetWithDetailsAsync(Guid transactionId)
    {
        return await All
            .Include(t => t.Branch)
            .Include(t => t.TransactionItems)
            .ThenInclude(ti => ti.InventoryItem)
            .Include(t => t.AccountingEntries)
            .ThenInclude(ae => ae.DebitLedgerAccount)
            .Include(t => t.AccountingEntries)
            .ThenInclude(ae => ae.CreditLedgerAccount)
            .Include(t => t.TaxEntries)
            .FirstOrDefaultAsync(t => t.Id == transactionId);
    }

    public async Task<string> GenerateTransactionNumberAsync(TransactionType transactionType)
    {
        var prefix = transactionType switch
        {
            TransactionType.Purchase => "PUR",
            TransactionType.PurchaseReturn => "PRN",
            TransactionType.Sale => "SAL",
            TransactionType.SaleReturn => "SRN",
            TransactionType.Expense => "EXP",
            TransactionType.StockAdjustment => "ADJ",
            TransactionType.OpeningBalance => "OBL",
            TransactionType.YearEndClosing => "YEC",
            TransactionType.Payroll => "PRL",
            TransactionType.LoanPayable => "LPA",
            TransactionType.Payment => "PAY",
            TransactionType.LoanRepayment => "LRE",
            TransactionType.DirectEntry => "DRE",
            TransactionType.StockTransferFromBranch => "STF",
            TransactionType.StockTransferToBranch => "STT",
            _ => "TXN"
        };

        var today = DateTime.Today;
        var count = await All
            .CountAsync(t => t.TransactionType == transactionType &&
                           t.TransactionDate.Date == today);

        return $"{prefix}-{today:yyyyMMdd}-{(count + 1):D4}";
    }

    public async Task<TransactionList> GetTransactions(TransactionResource transactionResource)
    {
        var collectionBeforePaging = All.Include(c => c.Branch).AsQueryable();
        collectionBeforePaging = collectionBeforePaging.ApplySort(transactionResource.OrderBy,
       _propertyMappingService.GetPropertyMapping<TransactionDto, Transaction>());

        if (transactionResource.BranchId.HasValue)
        {
            collectionBeforePaging = collectionBeforePaging
                .Where(a => a.BranchId == transactionResource.BranchId);
        }
        else
        {
            collectionBeforePaging = collectionBeforePaging
                .Where(a => _userInfoToken.LocationIds.Contains(a.BranchId));
        }
        if (!string.IsNullOrWhiteSpace(transactionResource.TransactionNumber))
        {
            var transactionNumber = transactionResource.TransactionNumber.Trim();
            collectionBeforePaging = collectionBeforePaging
                .Where(a => EF.Functions.Like(a.TransactionNumber, $"%{transactionNumber}%"));
        }
        if (!string.IsNullOrWhiteSpace(transactionResource.ReferenceNumber))
        {
            var referenceNumber = transactionResource.ReferenceNumber.Trim();
            collectionBeforePaging = collectionBeforePaging
                .Where(a => EF.Functions.Like(a.TransactionNumber, $"%{referenceNumber}%"));
        }
        if (transactionResource.PaymentStatus.HasValue)
        {
            collectionBeforePaging = collectionBeforePaging
                .Where(a => a.PaymentStatus == transactionResource.PaymentStatus);
        }

        if (transactionResource.TransactionType.HasValue)
        {
            collectionBeforePaging = collectionBeforePaging
                .Where(a => a.TransactionType == transactionResource.TransactionType);
        }
        if (transactionResource.Status.HasValue)
        {
            collectionBeforePaging = collectionBeforePaging
                .Where(a => a.Status == transactionResource.Status);
        }

        if (transactionResource.FromDate.HasValue && transactionResource.ToDate.HasValue)
        {
            var startDate = transactionResource.FromDate.Value.ToLocalTime();
            var endDate = transactionResource.ToDate.Value.ToLocalTime();

            DateTime minDate = new DateTime(startDate.Year, startDate.Month, startDate.Day, 0, 0, 0);
            DateTime maxDate = new DateTime(endDate.Year, endDate.Month, endDate.Day, 23, 59, 59);

            collectionBeforePaging = collectionBeforePaging
                        .Where(c => c.TransactionDate >= minDate &&
                            c.TransactionDate <= maxDate);
        }
        else
        {
            var today = DateTime.UtcNow;
            var currentYearStart = new DateTime(today.Year, 1, 1);
            var currentYearEnd = new DateTime(today.Year, 12, 31, 23, 59, 59);

            collectionBeforePaging = collectionBeforePaging
                .Where(c => c.TransactionDate >= currentYearStart
                         && c.TransactionDate <= currentYearEnd);
        }
        var transactionList = new TransactionList();
        return await transactionList.Create(
            collectionBeforePaging,
            transactionResource.Skip,
            transactionResource.PageSize);
    }
}

