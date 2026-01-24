using System;
using System.Threading.Tasks;
using POS.Common.GenericRepository;
using POS.Data.Entities;
using POS.Data.Resources;

namespace POS.Repository
{
    public interface IProductStockRepository : IGenericRepository<ProductStock>
    {
        Task<ProductStock> GetProductStock(Guid locationId, Guid productId);

        Task<ProductStock> AddProductStock(Guid productId, Guid loactionId);
        Task<ProductStockAlertList> GetProductStockAlertsAsync(ProductStockAlertResource productStockAlertResource);
        decimal ConvertStockAndPriceBaseUnitToUnit(Guid UnitId, ProductStock productStock);
        Task<ProductStockList> GetProducStocks(ProductStockResource productStockResource);

    }
}
