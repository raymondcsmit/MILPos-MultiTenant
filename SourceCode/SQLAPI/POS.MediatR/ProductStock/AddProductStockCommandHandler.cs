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
    public class AddProductStockCommandHandler(
        ITaxRepository _taxRepository,
        IProductRepository _productRepository,
        IUnitConversationRepository _unitConversationRepository,
        IAccountingService _accountingService,
        ILogger<AddProductStockCommandHandler> _logger,
        IPaymentService _paymentService) : IRequestHandler<AddProductStockCommand, ServiceResponse<bool>>
    {
        public async Task<ServiceResponse<bool>> Handle(AddProductStockCommand request, CancellationToken cancellationToken)
        {

            try
            {
                var taxes = await _taxRepository.All.ToListAsync();
                decimal totalTaxPercentage = 0.00m;
                var taxIdsFromRequest = new List<Guid>();
                // Check if item has any taxes
                if (request.ProductTaxes.Count > 0)
                {
                    taxIdsFromRequest = request.ProductTaxes
                              .Select(t => t.TaxId)
                              .ToList();

                    totalTaxPercentage = taxes
                       .Where(dbTax => taxIdsFromRequest.Contains(dbTax.Id))
                       .Sum(dbTax => dbTax.Percentage);
                }

                var baseConversion = await _unitConversationRepository.GetBaseUnitValuesAsync(request.UnitId, Math.Abs((decimal)request.CurrentStock), request.PricePerUnit);

                var transactionItem = new TransactionItemDto();
                transactionItem.DiscountPercentage = 0;
                transactionItem.Quantity = baseConversion.BaseQuantity;
                transactionItem.UnitId = baseConversion.UnitId;
                transactionItem.UnitPrice = baseConversion.BaseUnitPrice;
                transactionItem.PurchasePrice = baseConversion.BaseUnitPrice;
                transactionItem.InventoryItemId = request.ProductId;
                transactionItem.TaxPercentage = totalTaxPercentage;
                transactionItem.DiscountType = "fixed";

                var transaction = new CreateTransactionDto
                {
                    BranchId = request.LocationId,
                    TransactionDate = DateTime.UtcNow,
                    TransactionType = TransactionType.StockAdjustment,

                };
                //Remove Stock From Inventory
                if (request.CurrentStock < 0)
                {
                    transaction.Narration = "Loss Stock Adjustment (Remove)";
                    transactionItem.TaxIds = [];
                }
                //Add Stock In Inventory
                else
                {
                    //Update PurchasePrice in Product 
                    var Product = await _productRepository.All.Where(c => c.Id == request.ProductId).FirstOrDefaultAsync();
                    if (Product != null)
                    {
                        Product.PurchasePrice = baseConversion.BaseUnitPrice;
                        _productRepository.Update(Product);
                    }
                    transaction.Narration = "Gain Stock Adjustment (Add)";
                    transactionItem.TaxIds = taxIdsFromRequest;

                }
                transaction.Items = new List<TransactionItemDto> { transactionItem };
                await _accountingService.ProcessTransactionAsync(transaction);

                try
                {

                    var paymentDto = new PaymentDto
                    {
                        BranchId = request.LocationId,
                        OrderNumber = request.ReferenceNumber,
                        PaymentDate = DateTime.UtcNow,
                        PaymentMethod = request.PaymentMethod,
                        ReferenceNumber = request.ReferenceNumber,
                        TransactionType = TransactionType.StockAdjustment
                    };

                    if(request.CurrentStock < 0)
                    {
                        paymentDto.Notes = "Remove (Loss)";
                        paymentDto.Amount = Math.Abs( request.CurrentStock.Value * request.PricePerUnit);
                    }
                    else
                    {
                       
                        decimal lineSubTotal = request.CurrentStock.Value * request.PricePerUnit;
                        decimal totalTax = lineSubTotal * (totalTaxPercentage / 100);
                        paymentDto.Notes = "Add (Gain)";
                        paymentDto.Amount = lineSubTotal + totalTax;
                    }
                    await _paymentService.ProcessPaymentAsync(paymentDto);
                }
                catch (System.Exception ex)
                {
                    _logger.LogError(ex, "error while saving the purchase order payment accounting.");
                }
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while saving inventory Accounting");
            }

            return ServiceResponse<bool>.ReturnSuccess();
        }
        
    }
}
