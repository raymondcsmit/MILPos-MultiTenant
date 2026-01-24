using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Domain;
using POS.Helper;
using POS.MediatR.Accouting.Services;
using POS.MediatR.Stock.Commands;
using POS.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Stock.Handlers
{
    public class AddDamagedStockCommandHandler(
        UserInfoToken _userInfoToken,
        IDamagedStockRepository _damagedStockRepository,
        ILogger<AddDamagedStockCommandHandler> _logger,
        IMapper _mapper,
        IUnitOfWork<POSDbContext> _uow,
        IAccountingService _accountingService,
        IProductStockRepository _productStockRepository,
        ITaxRepository _taxRepository,
        IProductTaxRepository _productTaxRepository) : IRequestHandler<AddDamagedStockCommand, ServiceResponse<List<DamagedStockDto>>>
    {
        public async Task<ServiceResponse<List<DamagedStockDto>>> Handle(AddDamagedStockCommand request, CancellationToken cancellationToken)
        {
            var damagedStock = new List<DamagedStock>();
            foreach (var item in request.DamagedStockItems)
            {
                var entity = _mapper.Map<DamagedStock>(request);
                entity.Id = Guid.NewGuid();
                entity.DamagedDate = request.DamagedDate;
                entity.ReportedId = request.ReportedId;
                entity.ProductId = item.ProductId;
                entity.DamagedQuantity = item.DamagedQuantity;
                entity.LocationId = request.LocationId;
                entity.CreatedBy = _userInfoToken.Id;
                entity.CreatedDate = DateTime.UtcNow;
                damagedStock.Add(entity);
            }

            _damagedStockRepository.AddRange(damagedStock);

            if (await _uow.SaveAsync() <= 0)
            {

                _logger.LogError("Error While saving Damaged Stock.");
                return ServiceResponse<List<DamagedStockDto>>.Return500();
            }
            var entityDto = _mapper.Map<List<DamagedStockDto>>(damagedStock);

            //Accounting Entries
            try
            {
                var requsetProductIds = request.DamagedStockItems.Select(c => c.ProductId).ToList();
                var stockList = await _productStockRepository.All
                    .Where(c => c.LocationId == request.LocationId && requsetProductIds.Contains(c.ProductId)).ToListAsync();

                var transactionItems = new List<TransactionItemDto>();
                foreach (var item in request.DamagedStockItems)
                {

                    var productStock = stockList.FirstOrDefault(s => s.ProductId == item.ProductId);
                    var transactionItem = new TransactionItemDto();
                    transactionItem.DiscountPercentage = 0;
                    transactionItem.TaxPercentage = 0;
                    transactionItem.Quantity = item.DamagedQuantity;
                    transactionItem.UnitId = item.UnitId;
                    transactionItem.UnitPrice = productStock != null ? productStock.PurchasePrice : 0;
                    transactionItem.InventoryItemId = item.ProductId;
                    transactionItem.TaxIds = [];
                    transactionItem.PurchasePrice = productStock.PurchasePrice;
                    transactionItem.DiscountType = "percentage";
                    transactionItems.Add(transactionItem);
                }
                var transaction = new CreateTransactionDto
                {
                    BranchId = request.LocationId,
                    Narration = "Loss Damage Stock (Remove)",
                    TransactionDate = DateTime.UtcNow,
                    TransactionType = TransactionType.StockAdjustment,
                    Items = transactionItems,
                };
                await _accountingService.ProcessTransactionAsync(transaction);
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "error while saving Accounting ");
            }
            return ServiceResponse<List<DamagedStockDto>>.ReturnResultWith200(entityDto);
        }
    }
}
