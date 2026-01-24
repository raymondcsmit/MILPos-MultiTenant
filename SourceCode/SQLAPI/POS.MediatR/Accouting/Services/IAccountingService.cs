using POS.Data.Dto;
using POS.Data.Entities.Accounts;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting.Services;
public interface IAccountingService
{
    Task<TransactionResponseDto> ProcessTransactionAsync(CreateTransactionDto transactionDto);
    Task<TransactionResponseDto> ProcessStockAdjustmentAsync(StockAdjustmentDto adjustmentDto);
    Task<bool> ReverseTransactionAsync(Guid transactionId);
    Task<IEnumerable<AccountingEntry>> GetAccountingEntriesAsync(Guid transactionId);
    Task<decimal> GetLedgerBalanceAsync(Guid ledgerAccountId, Guid branchId);
}
