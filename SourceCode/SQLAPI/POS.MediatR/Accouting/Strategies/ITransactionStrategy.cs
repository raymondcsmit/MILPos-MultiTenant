using POS.Data.Entities;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting.Strategies;

public interface ITransactionStrategy
{
    Task ProcessTransactionAsync(Transaction transaction);
}

public interface IPurchaseStrategy : ITransactionStrategy { }
public interface IPurchaseReturnStrategy : ITransactionStrategy { }
public interface ISaleStrategy : ITransactionStrategy { }
public interface ISaleReturnStrategy : ITransactionStrategy { }
public interface IExpenseStrategy : ITransactionStrategy { }
public interface IStockAdjustmentStrategy : ITransactionStrategy { }
