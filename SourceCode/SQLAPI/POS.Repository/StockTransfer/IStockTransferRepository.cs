using System.Threading.Tasks;
using POS.Common.GenericRepository;
using POS.Data.Entities;
using POS.Data.Resources;

namespace POS.Repository
{
    public interface IStockTransferRepository : IGenericRepository<StockTransfer>
    {
        Task<StockTransferList> GetStockTranfers(StockTranferResource stockTranferResource);
    }
}
