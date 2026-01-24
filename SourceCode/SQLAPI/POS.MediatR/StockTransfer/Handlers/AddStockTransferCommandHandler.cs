using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Data.Enums;
using POS.Domain;
using POS.Helper;
using POS.MediatR.Accouting.Services;
using POS.MediatR.Accouting.Strategies;
using POS.MediatR.Commands;
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Handlers
{
    public class AddStockTransferCommandHandler(IUnitOfWork<POSDbContext> _uow,
        IMapper _mapper,
        IStockTransferRepository _stockTransferRepository,
        ILogger<AddStockTransferCommand> _logger,
        IUnitConversationRepository _unitConversationRepository,
        IAccountingService _accountingService,
        ITaxRepository _taxRepository,
        IProductTaxRepository _productTaxRepository,
        IProductStockRepository  _productStockRepository,
        IFinancialYearRepository _financialYearRepository,
        ITransactionRepository _transactionRepository,
        ITransactionStrategyFactory _transactionStrategyFactory) : IRequestHandler<AddStockTransferCommand, ServiceResponse<StockTransferDto>>
    {
        public async Task<ServiceResponse<StockTransferDto>> Handle(AddStockTransferCommand request, CancellationToken cancellationToken)
        {
            var entity = _mapper.Map<Data.Entities.StockTransfer>(request);

            foreach (var item in entity.StockTransferItems)
            {
                item.Product = null;
                item.Unit = null;
            }
            // last stock Transfer Ref No
            var lastStockTransfer = await _stockTransferRepository.All
                .OrderByDescending(c => c.CreatedDate)
                .FirstOrDefaultAsync();

            entity.ReferenceNo = GenerateStockTransferNumber.GenerateStockTransferNumberAsync(lastStockTransfer != null ? lastStockTransfer.ReferenceNo : "");
            _stockTransferRepository.Add(entity);

            if (await _uow.SaveAsync() <= 0)
            {
                _logger.LogError("Save Page have Error");
                return ServiceResponse<StockTransferDto>.Return500();
            }
            var entityToReturn = _mapper.Map<StockTransferDto>(entity);
            if (request.Status == StockTransferStatus.Delivered)
            {
                try
                {
                    var financialYearId = await _financialYearRepository.All.Where(c => !c.IsClosed).Select(c => c.Id).FirstOrDefaultAsync();

                    //Accounting Entries
                    var transactionItems = new List<TransactionItemDto>();

                    var taxEntities = await _taxRepository.All.Select(c => new TaxDto
                    {
                        Id = c.Id,
                        Name = c.Name,
                        Percentage = c.Percentage
                    }).ToListAsync();

                    foreach (var item in request.StockTransferItems)
                    {
                        var baseConversion = await _unitConversationRepository.GetBaseUnitValuesAsync(item.UnitId, item.Quantity, item.UnitPrice);
                        decimal totalTaxPercentage = 0.00m;
                        decimal purchasePrice = await _productStockRepository.All.Where(c => c.ProductId == item.ProductId && c.LocationId == request.FromLocationId).Select(c => c.PurchasePrice).FirstOrDefaultAsync();
                        //Change Purchase Price in ToBranch
                        var stockToBranch = await _productStockRepository.All.Where(c => c.ProductId == item.ProductId && c.LocationId == request.ToLocationId).FirstOrDefaultAsync();
                        if(stockToBranch != null)
                        {
                            stockToBranch.PurchasePrice = purchasePrice;
                        }
                        // Tax Total on Product
                        var productTaxIds = await _productTaxRepository.All
                            .Where(c => c.ProductId == item.ProductId)
                            .Select(c => c.TaxId).ToListAsync();
                        totalTaxPercentage = taxEntities.Where(tax => productTaxIds.Contains(tax.Id)).Sum(tax => tax.Percentage);
                        var transactionItem = new TransactionItemDto
                        {
                            InventoryItemId = item.ProductId,
                            Quantity = baseConversion.BaseQuantity,
                            UnitPrice = baseConversion.BaseUnitPrice,
                            TaxPercentage = totalTaxPercentage,
                            UnitId = baseConversion.UnitId,
                            TaxIds = productTaxIds,
                            PurchasePrice= purchasePrice
                        };
                        transactionItems.Add(transactionItem);
                    }
                    var transactionDto = new CreateTransactionDto
                    {
                        BranchId = request.FromLocationId,
                        Narration = $"Stock Transfer From source Branch",
                        ReferenceNumber = entity.ReferenceNo,
                        TransactionDate = request.TransferDate.ToUniversalTime(),
                        Items = transactionItems
                    };

                    try
                    {
                        // Sale from the source branch
                        transactionDto.TransactionType = TransactionType.StockTransferFromBranch;
                        await _accountingService.ProcessTransactionAsync(transactionDto);

                        //  Purchase into the destination branch
                        transactionDto.TransactionType = TransactionType.StockTransferToBranch;
                        transactionDto.Narration = $"Stock Get From source Branch";
                        transactionDto.BranchId = request.ToLocationId;

                        await _accountingService.ProcessTransactionAsync(transactionDto);
                        //Save Shipping Expense Transaction 
                        if(request.TotalShippingCharge > 0)
                        {
                            var transaction = new Transaction
                            {
                                FinancialYearId = financialYearId,
                                BranchId = request.ToLocationId,
                                SubTotal = request.TotalShippingCharge,
                                CreatedDate = DateTime.UtcNow,
                                Narration = "Shipping charge Expense for stock transfer",
                                Status = TransactionStatus.Completed,
                                ReferenceNumber = entity.ReferenceNo,
                                TotalAmount = request.TotalShippingCharge,
                                TransactionDate = request.TransferDate.ToUniversalTime(),
                                TransactionType = TransactionType.Expense,
                                TransactionNumber = await _transactionRepository.GenerateTransactionNumberAsync(TransactionType.Expense),
                            };
                            //Save Accounting with Tax
                            var strategy = _transactionStrategyFactory.GetStrategy(transaction.TransactionType);
                            _transactionRepository.Add(transaction);
                            await strategy.ProcessTransactionAsync(transaction);
                            if (await _uow.SaveAsync() < 0)
                            {
                                return ServiceResponse<StockTransferDto>.Return500("An unexpected fault happened");
                            }
                        }
                       
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "error while Saving Accounting of Stock Transfers");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "error while Saving of Stock Transfers");
                }
            }
            return ServiceResponse<StockTransferDto>.ReturnResultWith200(entityToReturn);
        }
    }
}
