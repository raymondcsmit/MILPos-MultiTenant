using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Data.Common;
using System.Diagnostics;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace ApiAndQueriesProfiler
{
    public class ProfilerCommandInterceptor : DbCommandInterceptor
    {
        private readonly ProfilerLogChannel _channel;

        public ProfilerCommandInterceptor(ProfilerLogChannel channel)
        {
            _channel = channel;
        }

        public override InterceptionResult<DbDataReader> ReaderExecuting(
            DbCommand command, CommandEventData eventData, InterceptionResult<DbDataReader> result)
        {
            var stopwatch = Stopwatch.StartNew();
            eventData.Context.SavedChanges += (s, e) => { }; // just a trick to attach data if needed, but we'll use CommandContext
            return base.ReaderExecuting(command, eventData, result);
        }

        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
            DbCommand command, CommandEventData eventData, InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
        {
            return base.ReaderExecutingAsync(command, eventData, result, cancellationToken);
        }

        public override DbDataReader ReaderExecuted(
            DbCommand command, CommandExecutedEventData eventData, DbDataReader result)
        {
            LogQuery(command, (long)eventData.Duration.TotalMilliseconds);
            return base.ReaderExecuted(command, eventData, result);
        }

        public override ValueTask<DbDataReader> ReaderExecutedAsync(
            DbCommand command, CommandExecutedEventData eventData, DbDataReader result, CancellationToken cancellationToken = default)
        {
            LogQuery(command, (long)eventData.Duration.TotalMilliseconds);
            return base.ReaderExecutedAsync(command, eventData, result, cancellationToken);
        }
        
        public override int NonQueryExecuted(DbCommand command, CommandExecutedEventData eventData, int result)
        {
            LogQuery(command, (long)eventData.Duration.TotalMilliseconds);
            return base.NonQueryExecuted(command, eventData, result);
        }

        public override ValueTask<int> NonQueryExecutedAsync(DbCommand command, CommandExecutedEventData eventData, int result, CancellationToken cancellationToken = default)
        {
            LogQuery(command, (long)eventData.Duration.TotalMilliseconds);
            return base.NonQueryExecutedAsync(command, eventData, result, cancellationToken);
        }

        public override object ScalarExecuted(DbCommand command, CommandExecutedEventData eventData, object result)
        {
            LogQuery(command, (long)eventData.Duration.TotalMilliseconds);
            return base.ScalarExecuted(command, eventData, result);
        }

        public override ValueTask<object> ScalarExecutedAsync(DbCommand command, CommandExecutedEventData eventData, object result, CancellationToken cancellationToken = default)
        {
            LogQuery(command, (long)eventData.Duration.TotalMilliseconds);
            return base.ScalarExecutedAsync(command, eventData, result, cancellationToken);
        }

        private void LogQuery(DbCommand command, long durationMs)
        {
            var correlationId = ProfilerContext.CurrentCorrelationId;
            if (string.IsNullOrEmpty(correlationId)) return;

            var parameters = new StringBuilder();
            foreach (DbParameter param in command.Parameters)
            {
                parameters.Append($"{param.ParameterName}={param.Value};");
            }

            var log = new EfQueryLog
            {
                CorrelationId = correlationId,
                CommandText = command.CommandText,
                Parameters = parameters.ToString(),
                DurationMs = durationMs
            };

            _channel.TryWrite(log);
        }
    }
}
