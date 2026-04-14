using System;
using System.Linq;
using System.Net;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Data.Resources;
using POS.Domain;

namespace POS.Repository
{
    public class ProductStockRepository(
        IUnitOfWork<POSDbContext> _uow,
        IProductRepository _productRepository,
        IPropertyMappingService _propertyMappingService,
        UserInfoToken _userInfoToken,
        IUnitConversationRepository _unitConversationRepository) : GenericRepository<ProductStock, POSDbContext>(_uow), IProductStockRepository
    {
        public async Task<ProductStock> GetProductStock(Guid locationId, Guid productId)
        {
            var productStockExist = await All.Where(c => c.ProductId == productId && c.LocationId == locationId)
                .FirstOrDefaultAsync();
            if (productStockExist != null)
            {
                return productStockExist;
            }

            return await AddProductStock(locationId, productId);
        }

        public async Task<ProductStock> AddProductStock(Guid locationId, Guid productId)
        {
            var lastStock = await All.Where(c => c.ProductId == productId)
                .OrderByDescending(c => c.ModifiedDate).FirstOrDefaultAsync();
            if (lastStock != null)
            {
                var ProductStock = new ProductStock
                {
                    PurchasePrice = lastStock.PurchasePrice,
                    CurrentStock = 0.0m,
                    LocationId = locationId,
                    ModifiedDate = DateTime.UtcNow,
                    ProductId = productId
                };
                Add(ProductStock);
                if (await _uow.SaveAsync() <= 0)
                {
                    throw new Exception("error while saving Product Stock");
                }
                return ProductStock;
            }
            var product = await _productRepository.All.Where(c => c.Id == productId).FirstOrDefaultAsync();
            if (product == null)
            {
                throw new Exception("error while saving Product Stock");
            }
            var productStock = new ProductStock
            {
                LocationId = locationId,
                CurrentStock = 0.0m,
                ModifiedDate = DateTime.UtcNow,
                ProductId = productId,
                PurchasePrice = product.PurchasePrice != null ? product.PurchasePrice.Value : 0.00m,
            };
            Add(productStock);
            if (await _uow.SaveAsync() <= 0)
            {
                throw new Exception("error while saving Product Stock");
            }
            return productStock;
        }

        public async Task<ProductStockAlertList> GetProductStockAlertsAsync(ProductStockAlertResource productStockAlertResource)
        {
            var collectionBeforePaging =
               AllIncluding(c => c.Product, u => u.Product.Unit, l => l.Location)
               .ApplySort(productStockAlertResource.OrderBy, _propertyMappingService.GetPropertyMapping<ProductStockDto, ProductStock>());

            collectionBeforePaging = collectionBeforePaging.Where(c => c.Product.AlertQuantity.HasValue
                    && c.CurrentStock <= c.Product.AlertQuantity);

            if (productStockAlertResource.LocationId.HasValue)
            {
                collectionBeforePaging = collectionBeforePaging.Where(c => c.LocationId == productStockAlertResource.LocationId);
            }
            else
            {
                collectionBeforePaging = collectionBeforePaging.Where(l => _userInfoToken.LocationIds.Contains(l.LocationId));
            }

            if (!string.IsNullOrWhiteSpace(productStockAlertResource.ProductName))
            {
                // trim & ignore casing
                var genreForWhereClause = productStockAlertResource.ProductName
                    .Trim().ToLowerInvariant();
                var name = Uri.UnescapeDataString(genreForWhereClause);
                var encodingName = WebUtility.UrlDecode(name);
                var ecapestring = Regex.Unescape(encodingName);
                encodingName = encodingName.Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_").Replace("[", @"\[").Replace(" ", "%");
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => EF.Functions.Like(a.Product.Name, $"{encodingName}%"));
            }

            var stockAlerts = new ProductStockAlertList();

            return await stockAlerts.Create(collectionBeforePaging, productStockAlertResource.Skip, productStockAlertResource.PageSize);
        }

        public decimal ConvertStockAndPriceBaseUnitToUnit(Guid UnitId, ProductStock productStock)
        {
            var unit = _unitConversationRepository.AllIncluding(c => c.Parent)
                .FirstOrDefault(c => c.Id == UnitId);
            decimal stock = 0;

            if (unit.Operator.HasValue && unit.Value.HasValue)
            {
                switch (unit.Operator)
                {
                    case Operator.Plush:
                        stock = productStock.CurrentStock - unit.Value.Value;
                        break;
                    case Operator.Minus:
                        stock = productStock.CurrentStock + unit.Value.Value;
                        break;
                    case Operator.Multiply:
                        stock = Math.Round(productStock.CurrentStock / unit.Value.Value, 2);
                        break;
                    case Operator.Divide:
                        stock = Math.Round(productStock.CurrentStock * unit.Value.Value, 2);
                        break;
                    default:
                        break;
                }
            }
            return stock;
        }

        public async Task<ProductStockList> GetProducStocks(ProductStockResource productStockResource)
        {
            var collectionBeforePaging =
               AllIncluding(c => c.Product, u => u.Product.Unit, c => c.Product.ProductCategory, c => c.Product.Brand).ApplySort(productStockResource.OrderBy,
               _propertyMappingService.GetPropertyMapping<ProductStockDto, ProductStock>());

            collectionBeforePaging = collectionBeforePaging.Where(c => c.LocationId == productStockResource.LocationId);

            if (!string.IsNullOrWhiteSpace(productStockResource.ProductName))
            {
                // trim & ignore casing
                var genreForWhereClause = productStockResource.ProductName
                    .Trim().ToLowerInvariant();
                var name = Uri.UnescapeDataString(genreForWhereClause);
                var encodingName = WebUtility.UrlDecode(name);
                var ecapestring = Regex.Unescape(encodingName);
                encodingName = encodingName.Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_").Replace("[", @"\[").Replace(" ", "%");
                collectionBeforePaging = collectionBeforePaging
                    .Where(a => EF.Functions.Like(a.Product.Name, $"{encodingName}%"));
            }

            var productStockList = new ProductStockList();
            return await productStockList.Create(collectionBeforePaging, productStockResource.Skip, productStockResource.PageSize);
        }



        public async Task UpdateProductStockAsync(Guid locationId, Guid productId, decimal newStockValue)
        {
            var productStock = await All.FirstOrDefaultAsync(c => c.ProductId == productId && c.LocationId == locationId);
            if (productStock == null)
            {
                // Create if not exists with initial value
                productStock = new ProductStock
                {
                    ProductId = productId,
                    LocationId = locationId,
                    CurrentStock = newStockValue,
                    ModifiedDate = DateTime.UtcNow
                };
                Add(productStock);
            }
            else
            {
                // Update absolute value
                productStock.CurrentStock = newStockValue;
                productStock.ModifiedDate = DateTime.UtcNow;
                Update(productStock);
            }
            
            // Note: SaveAsync is usually called by UnitOfWork in the handler, 
            // but since AddProductStock internally calls SaveAsync, we should follow consistency.
            // However, typical pattern is Handler calls Complete(). 
            // ProductStockRepository.AddProductStock calls SaveAsync internally which is inconsistent but we must respect it.
            // But for this bulk operation, we should probably let the handler call SaveAsync once at the end 
            // OR if we want to support immediate persistence.
            // Given BulkUpdateStockCommand handles persistence, we might not need to call SaveAsync here 
            // IF the handler uses UOW. But looking at AddProductStock, it calls SaveAsync immediately.
            // We will NOT call SaveAsync here to allow Bulk Handler to save once for performance.
        }

    }
}
