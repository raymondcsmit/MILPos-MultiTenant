using POS.Data.Entities;
using System;
using System.Threading.Tasks;



namespace POS.MediatR.Accouting.Services;
public interface IInventoryService
{
    Task ProcessInventoryChangesAsync(Transaction transaction);
    decimal GetCurrentStockAsync(Guid inventoryItemId);
}
