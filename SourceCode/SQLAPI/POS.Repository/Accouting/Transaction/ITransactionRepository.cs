using POS.Common.GenericRepository;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Data.Resources;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace POS.Repository;
public interface ITransactionRepository : IGenericRepository<Transaction>
{
    Task<Transaction> GetByTransactionNumberAsync(string transactionNumber);
    Task<IEnumerable<Transaction>> GetByBranchIdAsync(Guid branchId);
    Task<IEnumerable<Transaction>> GetByTransactionTypeAsync(TransactionType transactionType, Guid? branchId = null);
    Task<Transaction> GetWithDetailsAsync(Guid transactionId);
    Task<string> GenerateTransactionNumberAsync(TransactionType transactionType);
    Task<TransactionList> GetTransactions(TransactionResource transactionResource);
}
