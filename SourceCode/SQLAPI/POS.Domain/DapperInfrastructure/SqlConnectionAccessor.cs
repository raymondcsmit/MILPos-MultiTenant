using System.Data;
using Microsoft.EntityFrameworkCore;
using POS.Common.DapperInfrastructure;
using Microsoft.EntityFrameworkCore.Storage;

namespace POS.Domain.DapperInfrastructure
{
    public class SqlConnectionAccessor : ISqlConnectionAccessor
    {
        private readonly POSDbContext _dbContext;

        public SqlConnectionAccessor(POSDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public IDbConnection GetOpenConnection()
        {
            var connection = _dbContext.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                connection.Open();
            }
            return connection;
        }

        public IDbTransaction GetCurrentTransaction()
        {
            return _dbContext.Database.CurrentTransaction?.GetDbTransaction();
        }

        public string GetTableName<TEntity>() where TEntity : class
        {
            var entityType = _dbContext.Model.FindEntityType(typeof(TEntity));
            var tableName = entityType?.GetTableName();
            var schema = entityType?.GetSchema();

            if (string.IsNullOrEmpty(tableName))
            {
                return typeof(TEntity).Name; // Fallback
            }

            // Properly format schema and table name if necessary
            return string.IsNullOrEmpty(schema) ? $"\"{tableName}\"" : $"\"{schema}\".\"{tableName}\"";
        }
    }
}