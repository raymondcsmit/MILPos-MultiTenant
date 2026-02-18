using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace POS.Common.Services
{
    public interface IDbUtilityService
    {
        Task DisableForeignKeyCheckAsync(DbContext context);
        Task EnableForeignKeyCheckAsync(DbContext context);
        Task EnsureMigrationHistoryAsync(DbContext context);
    }
}
