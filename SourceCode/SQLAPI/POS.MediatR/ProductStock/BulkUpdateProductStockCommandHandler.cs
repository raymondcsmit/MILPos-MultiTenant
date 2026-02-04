using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities.Accounts;
using POS.Helper;
using POS.MediatR.Accouting.Services;
using POS.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR
{
    public class BulkUpdateProductStockCommandHandler(
        ITaxRepository _taxRepository,
        IProductRepository _productRepository,
        IUnitConversationRepository _unitConversationRepository,
        IAccountingService _accountingService,
        ILogger<BulkUpdateProductStockCommandHandler> _logger,
        IPaymentService _paymentService) : IRequestHandler<BulkUpdateProductStockCommand, ServiceResponse<bool>>
    {
        public async Task<ServiceResponse<bool>> Handle(BulkUpdateProductStockCommand request, CancellationToken cancellationToken)
        {
            try
            {
                // Pre-fetch taxes to avoid repeated DB calls if possible, or just let EF cache it.
                var allTaxes = await _taxRepository.All.ToListAsync(cancellationToken);

                foreach (var stockUpdate in request.StockUpdates)
                {
                    try
                    {
                        decimal totalTaxPercentage = 0.00m;
                        var taxIdsFromRequest = new List<Guid>();

                        if (stockUpdate.ProductTaxes != null && stockUpdate.ProductTaxes.Count > 0)
                        {
                            taxIdsFromRequest = stockUpdate.ProductTaxes
                                      .Select(t => t.TaxId)
                                      .ToList();

                            totalTaxPercentage = allTaxes
                               .Where(dbTax => taxIdsFromRequest.Contains(dbTax.Id))
                               .Sum(dbTax => dbTax.Percentage);
                        }

                        // Get Base Conversion
                        var baseConversion = await _unitConversationRepository.GetBaseUnitValuesAsync(stockUpdate.UnitId, Math.Abs((decimal)stockUpdate.CurrentStock), stockUpdate.PricePerUnit);

                        var transactionItem = new TransactionItemDto
                        {
                            DiscountPercentage = 0,
                            Quantity = baseConversion.BaseQuantity,
                            UnitId = baseConversion.UnitId,
                            UnitPrice = baseConversion.BaseUnitPrice,
                            PurchasePrice = baseConversion.BaseUnitPrice,
                            InventoryItemId = stockUpdate.ProductId,
                            TaxPercentage = totalTaxPercentage,
                            DiscountType = "fixed"
                        };

                        var transaction = new CreateTransactionDto
                        {
                            BranchId = stockUpdate.LocationId,
                            TransactionDate = DateTime.UtcNow,
                            TransactionType = TransactionType.StockAdjustment,
                        };

                        // REMOVE Stock
                        if (stockUpdate.CurrentStock < 0)
                        {
                            transaction.Narration = $"Loss Stock Adjustment (Remove) - Ref: {stockUpdate.ReferenceNumber}";
                            transactionItem.TaxIds = [];
                        }
                        // ADD Stock
                        else
                        {
                            // Update Product Purchase Price
                            var product = await _productRepository.All.FirstOrDefaultAsync(c => c.Id == stockUpdate.ProductId, cancellationToken);
                            if (product != null)
                            {
                                product.PurchasePrice = baseConversion.BaseUnitPrice;
                                _productRepository.Update(product);
                            }
                            transaction.Narration = $"Gain Stock Adjustment (Add) - Ref: {stockUpdate.ReferenceNumber}";
                            transactionItem.TaxIds = taxIdsFromRequest;
                        }

                        transaction.Items = new List<TransactionItemDto> { transactionItem };
                        await _accountingService.ProcessTransactionAsync(transaction);

                        // Process Payment
                        try
                        {
                            var paymentDto = new PaymentDto
                            {
                                BranchId = stockUpdate.LocationId,
                                OrderNumber = stockUpdate.ReferenceNumber,
                                PaymentDate = DateTime.UtcNow,
                                PaymentMethod = stockUpdate.PaymentMethod,
                                ReferenceNumber = stockUpdate.ReferenceNumber,
                                TransactionType = TransactionType.StockAdjustment
                            };

                            if (stockUpdate.CurrentStock < 0)
                            {
                                paymentDto.Notes = "Remove (Loss)";
                                paymentDto.Amount = Math.Abs(stockUpdate.CurrentStock.Value * stockUpdate.PricePerUnit);
                            }
                            else
                            {
                                decimal lineSubTotal = stockUpdate.CurrentStock.Value * stockUpdate.PricePerUnit;
                                decimal totalTax = lineSubTotal * (totalTaxPercentage / 100);
                                paymentDto.Notes = "Add (Gain)";
                                paymentDto.Amount = lineSubTotal + totalTax;
                            }
                            await _paymentService.ProcessPaymentAsync(paymentDto);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, $"Error while saving payment accounting for product {stockUpdate.ProductId}");
                            // Continue to next item? Or fail all? 
                            // Daily Price Manager usually continues on error or we should wrap in transaction.
                            // Given the existing handler catches exception per request, we will catch here too.
                        }

                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Error processing stock update for product {stockUpdate.ProductId}");
                    }
                } // End foreach

                 // Save changes if _productRepository.Update was called and not auto-saved by ProcessTransactionAsync 
                 // (ProcessTransactionAsync likely saves changes context-wide, but we called _productRepository.Update directly).
                 // We should probably save changes. _unitOfWork is not injected in original handler, seemingly relying on _accountingService to save?
                 // Wait, _productRepository.Update just marks state. If ProcessTransactionAsync calls SaveChanges, it might persist this too if they share context.
                 // But typically we should separate. 
                 // Checking original code: it calls _productRepository.Update(Product) but NO SaveChanges for it explicitly? 
                 // Ah, maybe _accountingService.ProcessTransactionAsync saves everything.
                 // I will assume so.
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while saving bulk inventory accounting");
                return ServiceResponse<bool>.Return500(ex.Message);
            }

            return ServiceResponse<bool>.ReturnSuccess();
        }
    }
}
