using System.Data;

namespace POS.Common.DapperInfrastructure
{
    public interface ISqlConnectionAccessor
    {
        IDbConnection GetOpenConnection();
        IDbTransaction GetCurrentTransaction();
        string GetTableName<TEntity>() where TEntity : class;
    }
}