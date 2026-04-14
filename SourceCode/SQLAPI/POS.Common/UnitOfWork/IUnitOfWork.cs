using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using System.Threading.Tasks;

namespace POS.Common.UnitOfWork
{
    public interface IUnitOfWork<TContext>
        where TContext : DbContext
    {
        int Save();
        Task<int> SaveAsync();
        TContext Context { get; }
        
        Task<IDbContextTransaction> BeginTransactionAsync();
        Task CommitTransactionAsync();
        Task RollbackTransactionAsync();
    }
}
