using Microsoft.EntityFrameworkCore;
using POS.Common.UnitOfWork;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Domain;
using POS.MediatR.Accouting.Strategies;
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting.Services;
public class AccountingService(
    IUnitOfWork<POSDbContext> _unitOfWork,
     ITransactionStrategyFactory _strategyFactory,
     ITaxService _taxService,
     IProductRepository productRepository,
     ITransactionRepository transactionRepository,
     IInventoryService _inventoryService,
     IAccountingEntryRepository accountingEntryRepository,
     IFinancialYearRepository _financialYearRepository) : IAccountingService
{
    public async Task<TransactionResponseDto> ProcessTransactionAsync(CreateTransactionDto transactionDto)
    {
        try
        {
            //Current financial Year
            var financialYearId = await _financialYearRepository.All.Where(c => !c.IsClosed).Select(c => c.Id).FirstOrDefaultAsync();
            // Create transaction
            var transaction = new Transaction
            {
                TransactionType = transactionDto.TransactionType,
                BranchId = transactionDto.BranchId,
                TransactionDate = transactionDto.TransactionDate,
                Narration = transactionDto.Narration,
                ReferenceNumber = transactionDto.ReferenceNumber,
                FlatDiscount = transactionDto.FlatDiscount,
                TransactionNumber = await transactionRepository.GenerateTransactionNumberAsync(
                    transactionDto.TransactionType),
                FinancialYearId = financialYearId
            };

            // Add transaction items and calculate totals
            foreach (var itemDto in transactionDto.Items)
            {
                var transactionItem = new TransactionItem
                {
                    InventoryItemId = itemDto.InventoryItemId,
                    Quantity = itemDto.Quantity,
                    UnitPrice = itemDto.UnitPrice,
                    DiscountPercentage = itemDto.DiscountPercentage,
                    TaxPercentage = itemDto.TaxPercentage,
                    UnitId = itemDto.UnitId,
                    //TaxIds = itemDto.TaxIds,
                    PurchasePrice = itemDto.PurchasePrice,
                    DiscountType = itemDto.DiscountType
                };

                // Calculate line totals
                var lineSubTotal = transactionItem.Quantity * transactionItem.UnitPrice;
                transactionItem.DiscountAmount = itemDto.DiscountType == "fixed" ? transactionItem.DiscountPercentage : lineSubTotal * (transactionItem.DiscountPercentage / 100);
                var lineAfterDiscount = lineSubTotal - transactionItem.DiscountAmount;
                transactionItem.TaxAmount = lineAfterDiscount * (transactionItem.TaxPercentage / 100);
                transactionItem.LineTotal = lineAfterDiscount + transactionItem.TaxAmount;
                // attach taxes properly
                foreach (var taxId in itemDto.TaxIds)
                {
                    transactionItem.TransactionItemTaxes.Add(new TransactionItemTax
                    {
                        TaxId = taxId
                    });
                }

                transaction.TransactionItems.Add(transactionItem);
            }

            // Calculate transaction totals
            transaction.SubTotal = transaction.TransactionItems.Sum(ti => ti.Quantity * ti.UnitPrice);
            transaction.DiscountAmount = transaction.TransactionItems.Sum(ti => ti.DiscountAmount) + transaction.FlatDiscount;
            transaction.TaxAmount = transaction.TransactionItems.Sum(ti => ti.TaxAmount);
            transaction.TotalAmount = Math.Floor(transaction.SubTotal - transaction.DiscountAmount + transaction.TaxAmount);
            transaction.RoundOffAmount = transactionDto.RoundOffAmount;

            transactionRepository.Add(transaction);
            if (await _unitOfWork.SaveAsync() <= -1)
            {

            }

            // Get strategy and process accounting entries
            var strategy = _strategyFactory.GetStrategy(transactionDto.TransactionType);
            await strategy.ProcessTransactionAsync(transaction);

            // Process inventory changes
            await _inventoryService.ProcessInventoryChangesAsync(transaction);

            // Process tax entries
            _taxService.ProcessTaxEntriesAsync(transaction);

            transaction.Status = TransactionStatus.Completed;
            transactionRepository.Update(transaction);

            if (await _unitOfWork.SaveAsync() <= -1)
            {

            }
            //await _unitOfWork.SaveChangesAsync();

            //await _unitOfWork.CommitTransactionAsync();

            return new TransactionResponseDto
            {
                TransactionId = transaction.Id,
                TransactionNumber = transaction.TransactionNumber,
                TransactionType = transaction.TransactionType,
                BranchId = transaction.BranchId,
                TransactionDate = transaction.TransactionDate,
                SubTotal = transaction.SubTotal,
                DiscountAmount = transaction.DiscountAmount,
                TaxAmount = transaction.TaxAmount,
                RoundOffAmount = transaction.RoundOffAmount,
                TotalAmount = transaction.TotalAmount,
                Narration = transaction.Narration,
                Status = transaction.Status
            };
        }
        catch
        {
            throw;
        }
    }

    public async Task<TransactionResponseDto> ProcessStockAdjustmentAsync(StockAdjustmentDto adjustmentDto)
    {
        try
        {
            var inventoryItem = productRepository.Find(adjustmentDto.InventoryItemId);
            if (inventoryItem == null)
                throw new InvalidOperationException("Inventory item not found");

            // Create stock adjustment transaction
            var transaction = new Transaction
            {
                TransactionType = TransactionType.StockAdjustment,
                BranchId = adjustmentDto.BranchId,
                TransactionDate = DateTime.UtcNow,
                Narration = $"Stock Adjustment - {adjustmentDto.Reason}",
                ReferenceNumber = adjustmentDto.Reference,
                TransactionNumber = await transactionRepository.GenerateTransactionNumberAsync(
                    TransactionType.StockAdjustment),
                TotalAmount = adjustmentDto.Quantity * adjustmentDto.UnitCost
            };

            if (await _unitOfWork.SaveAsync() <= -1)
            {

            }

            // Create stock adjustment record
            var stockAdjustment = new StockAdjustment
            {
                InventoryItemId = adjustmentDto.InventoryItemId,
                BranchId = adjustmentDto.BranchId,
                AdjustmentType = adjustmentDto.AdjustmentType,
                Quantity = adjustmentDto.Quantity,
                UnitCost = adjustmentDto.UnitCost,
                TotalValue = adjustmentDto.Quantity * adjustmentDto.UnitCost,
                Reason = adjustmentDto.Reason,
                Reference = adjustmentDto.Reference,
                AdjustmentDate = DateTime.UtcNow
            };

            // Process accounting entries for stock adjustment
            var strategy = _strategyFactory.GetStrategy(TransactionType.StockAdjustment);
            await strategy.ProcessTransactionAsync(transaction);

            // Update inventory
            var quantityChange = adjustmentDto.AdjustmentType == StockAdjustmentType.Gain ?
                adjustmentDto.Quantity : -adjustmentDto.Quantity;
            await productRepository.UpdateProductCurrentStock(adjustmentDto.InventoryItemId, quantityChange);

            transaction.Status = TransactionStatus.Completed;
            transactionRepository.Update(transaction);
            if (await _unitOfWork.SaveAsync() <= -1)
            {

            }
            return new TransactionResponseDto
            {
                TransactionId = transaction.Id,
                TransactionNumber = transaction.TransactionNumber,
                TransactionType = transaction.TransactionType,
                BranchId = transaction.BranchId,
                TransactionDate = transaction.TransactionDate,
                TotalAmount = transaction.TotalAmount,
                Narration = transaction.Narration,
                Status = transaction.Status
            };
        }
        catch
        {
            throw;
        }
    }

    public async Task<bool> ReverseTransactionAsync(Guid transactionId)
    {
        try
        {
            var transaction = await transactionRepository.All
                .Include(c => c.TransactionItems)
                .Include(c => c.AccountingEntries)
                .Where(c => c.Id == transactionId)
                .FirstOrDefaultAsync();
            if (transaction == null || transaction.Status != TransactionStatus.Completed)
                return false;

            // Create reverse entries
            foreach (var entry in transaction.AccountingEntries)
            {
                var reverseEntry = new AccountingEntry
                {
                    TransactionId = transactionId,
                    BranchId = entry.BranchId,
                    DebitLedgerAccountId = entry.CreditLedgerAccountId, // Swap debit and credit
                    CreditLedgerAccountId = entry.DebitLedgerAccountId,
                    Amount = entry.Amount,
                    Narration = $"Reversal - {entry.Narration}",
                    Reference = $"REV-{entry.Reference}",
                    EntryDate = DateTime.UtcNow,
                    EntryType = EntryType.Regular
                };

                accountingEntryRepository.Add(reverseEntry);
            }

            // Reverse inventory changes
            foreach (var item in transaction.TransactionItems)
            {
                var reverseQuantity = transaction.TransactionType switch
                {
                    TransactionType.Purchase => -item.Quantity,
                    TransactionType.PurchaseReturn => item.Quantity,
                    TransactionType.Sale => item.Quantity,
                    TransactionType.SaleReturn => -item.Quantity,
                    _ => 0
                };

                if (reverseQuantity != 0)
                {
                    await productRepository.UpdateProductCurrentStock(item.InventoryItemId, reverseQuantity);
                }
            }

            transaction.Status = TransactionStatus.Reversed;
            transactionRepository.Update(transaction);
            if (await _unitOfWork.SaveAsync() <= -1)
            {

            }
            return true;
        }
        catch
        {
            throw;
        }
    }

    public async Task<IEnumerable<AccountingEntry>> GetAccountingEntriesAsync(Guid transactionId)
    {
        return await accountingEntryRepository.GetByTransactionIdAsync(transactionId);
    }

    public async Task<decimal> GetLedgerBalanceAsync(Guid ledgerAccountId, Guid branchId)
    {
        return await accountingEntryRepository.GetLedgerBalanceAsync(ledgerAccountId, branchId);
    }
}
