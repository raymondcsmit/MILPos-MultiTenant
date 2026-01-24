using Microsoft.Extensions.DependencyInjection;
using POS.Data.Entities.Accounts;
using System;

namespace POS.MediatR.Accouting.Strategies;

public class TransactionStrategyFactory : ITransactionStrategyFactory
{
    private readonly IServiceProvider _serviceProvider;

    public TransactionStrategyFactory(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public ITransactionStrategy GetStrategy(TransactionType transactionType)
    {
        return transactionType switch
        {
            TransactionType.Purchase => _serviceProvider.GetRequiredService<IPurchaseStrategy>(),
            TransactionType.PurchaseReturn => _serviceProvider.GetRequiredService<IPurchaseReturnStrategy>(),
            TransactionType.Sale => _serviceProvider.GetRequiredService<ISaleStrategy>(),
            TransactionType.SaleReturn => _serviceProvider.GetRequiredService<ISaleReturnStrategy>(),
            TransactionType.Expense => _serviceProvider.GetRequiredService<IExpenseStrategy>(),
            TransactionType.StockAdjustment => _serviceProvider.GetRequiredService<IStockAdjustmentStrategy>(),
            TransactionType.StockTransferFromBranch => _serviceProvider.GetRequiredService<ISaleStrategy>(),
            TransactionType.StockTransferToBranch => _serviceProvider.GetRequiredService<IPurchaseStrategy>(),
            _ => throw new NotSupportedException($"Transaction type {transactionType} is not supported")
        };
    }
}