using POS.Data.Entities.Accounts;

namespace POS.MediatR.Accouting.Strategies;

public interface ITransactionStrategyFactory
{
    ITransactionStrategy GetStrategy(TransactionType transactionType);
}