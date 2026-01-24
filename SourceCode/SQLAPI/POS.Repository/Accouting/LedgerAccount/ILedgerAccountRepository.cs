using System.Collections.Generic;
using System.Threading.Tasks;
using POS.Common.GenericRepository;
using POS.Data.Entities.Accounts;
using POS.Data.Resources;

namespace POS.Repository.Accouting;
public interface ILedgerAccountRepository : IGenericRepository<LedgerAccount>
{
    Task<LedgerAccount> GetByAccountCodeAsync(string accountCode);
    Task<IEnumerable<LedgerAccount>> GetByAccountTypeAsync(AccountType accountType);
    Task<IEnumerable<LedgerAccount>> GetByAccountGroupAsync(AccountGroup accountGroup);
    Task<IEnumerable<LedgerAccount>> GetActiveAccountsAsync();
}
