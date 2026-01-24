using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using System;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting.Services;
public class TaxService : ITaxService
{
    public void ProcessTaxEntriesAsync(Transaction transaction)
    {
        foreach (var item in transaction.TransactionItems)
        {
            if (item.TaxAmount > 0)
            {
                var taxType = transaction.TransactionType switch
                {
                    TransactionType.Purchase or TransactionType.Expense => TaxType.Input,
                    TransactionType.Sale => TaxType.Output,
                    TransactionType.PurchaseReturn => TaxType.Input,
                    TransactionType.SaleReturn => TaxType.Output,
                    _ => TaxType.Input
                };

                var taxEntry = new TaxEntry
                {
                    TransactionId = transaction.Id,
                    BranchId = transaction.BranchId,
                    TaxType = taxType,
                    TaxPercentage = item.TaxPercentage,
                    TaxableAmount = (item.Quantity * item.UnitPrice) - item.DiscountAmount,
                    TaxAmount = item.TaxAmount,
                    TaxDescription = $"{taxType} @ {item.TaxPercentage}%"
                };
                // Add tax entry to transaction
                transaction.TaxEntries.Add(taxEntry);
            }
        }
    }

    public decimal CalculateGSTAsync(decimal amount, decimal gstRate)
    {
        return amount * (gstRate / 100);
    }

    public async Task<decimal> GetApplicableTaxRateAsync(Guid inventoryItemId, Guid branchId)
    {
        // Default GST rate - this could be configurable based on item category
        await Task.CompletedTask;
        return 18.0m; // 18% GST
    }
}
