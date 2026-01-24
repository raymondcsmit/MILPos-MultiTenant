using POS.Data.Entities;
using System;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting.Services;
public interface ITaxService
{
    void ProcessTaxEntriesAsync(Transaction transaction);
    decimal CalculateGSTAsync(decimal amount, decimal gstRate);
    Task<decimal> GetApplicableTaxRateAsync(Guid inventoryItemId, Guid branchId);
}