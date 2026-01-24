using System.Threading.Tasks;
using POS.Common.GenericRepository;
using POS.Data.Entities;
using POS.Data.Resources;
using POS.Repository.Stock;

namespace POS.Repository
{
    public interface IDamagedStockRepository : IGenericRepository<DamagedStock>
    {
        Task<DamagedStockList> GetAllDamagedStocks(DamagedStockResource damagedStockResource);
    }
}
