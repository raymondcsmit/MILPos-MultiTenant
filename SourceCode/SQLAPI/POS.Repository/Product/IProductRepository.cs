using POS.Common.GenericRepository;
using POS.Data;
using POS.Data.Resources;
using System;
using System.Threading.Tasks;

namespace POS.Repository
{
    public interface IProductRepository : IGenericRepository<Product>
    {
        Task<ProductList> GetProducts(ProductResource supplierResource);

        Task UpdateProductCurrentStock(Guid productId, decimal quantity);
    }
}
