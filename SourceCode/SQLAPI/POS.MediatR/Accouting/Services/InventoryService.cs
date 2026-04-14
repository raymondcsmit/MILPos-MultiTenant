using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Domain;
using POS.Repository;
using System;
using System.Collections.Generic;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting.Services;
public class InventoryService(
    IProductRepository productRepository,
    IProductStockRepository _productStockRepository,
    IUnitOfWork<POSDbContext> uow,
    ILogger<InventoryService> logger) : IInventoryService
{
    public async Task ProcessInventoryChangesAsync(Transaction transaction)
    {
        //for tracked entity Detached
        var updatedStocks = new List<Data.Entities.ProductStock>();
        foreach (var item in transaction.TransactionItems)
        {
            var quantityChange = transaction.TransactionType switch
            {
                TransactionType.Purchase => item.Quantity,
                TransactionType.PurchaseReturn => -item.Quantity,
                TransactionType.Sale => -item.Quantity,
                TransactionType.SaleReturn => item.Quantity,
                TransactionType.StockTransferFromBranch => -item.Quantity,
                TransactionType.StockTransferToBranch => item.Quantity,
                TransactionType.StockAdjustment => transaction.Narration.Contains("Gain", StringComparison.OrdinalIgnoreCase)
                                ? item.Quantity : -item.Quantity,
                _ => 0
            };
            
            if (quantityChange != 0)
            {
                var productStock = await _productStockRepository.GetProductStock(transaction.BranchId, item.InventoryItemId);
                if (productStock != null)
                {
                    //Update Product Price LIFO
                    if (transaction.TransactionType == TransactionType.Purchase || (transaction.TransactionType == TransactionType.StockAdjustment && transaction.Narration.Contains("Gain", StringComparison.OrdinalIgnoreCase)))
                    {
                        productStock.PurchasePrice = item.PurchasePrice;
                    }
                    productStock.CurrentStock += quantityChange;

                    _productStockRepository.Update(productStock);
                    //belowe  For entity Detached only
                    updatedStocks.Add(productStock);
                }
            }
        }
        if (await uow.SaveAsync() <= 0)
        {
            logger.LogError("Error While saving product stock.");
        }
        // Detach all entities after save to stop tracking
        foreach (var stock in updatedStocks)
        {
            uow.Context.Entry(stock).State = EntityState.Detached;
        }

    }

    public decimal GetCurrentStockAsync(Guid inventoryItemId)
    {
        var item = productRepository.Find(inventoryItemId);
        return item?.CurrentStock ?? 0;
    }
}
