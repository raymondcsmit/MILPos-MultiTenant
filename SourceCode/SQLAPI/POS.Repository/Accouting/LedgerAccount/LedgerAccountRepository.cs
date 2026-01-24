using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data.Dto.Acconting;
using POS.Data.Entities.Accounts;
using POS.Data.Resources;
using POS.Domain;
using POS.Repository.Accouting;

namespace POS.Repository;
public class LedgerAccountRepository(IUnitOfWork<POSDbContext> uow) : GenericRepository<LedgerAccount, POSDbContext>(uow),
          ILedgerAccountRepository
{
    public async Task<LedgerAccount> GetByAccountCodeAsync(string accountCode)
    {
        return await All.FirstOrDefaultAsync(la => la.AccountCode == accountCode);
    }

    public async Task<IEnumerable<LedgerAccount>> GetByAccountTypeAsync(AccountType accountType)
    {
        return await All
            .Where(la => la.AccountType == accountType && la.IsActive)
            .ToListAsync();
    }

    public async Task<IEnumerable<LedgerAccount>> GetByAccountGroupAsync(AccountGroup accountGroup)
    {
        return await All
            .Where(la => la.AccountGroup == accountGroup && la.IsActive)
            .ToListAsync();
    }

    public async Task<IEnumerable<LedgerAccount>> GetActiveAccountsAsync()
    {
        return await All
            .Where(la => la.IsActive)
            .Include(la => la.ParentAccount)
            .ToListAsync();
    }

}