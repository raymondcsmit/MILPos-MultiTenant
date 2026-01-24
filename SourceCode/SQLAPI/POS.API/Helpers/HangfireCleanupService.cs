using Dapper;
using Hangfire;
using Microsoft.Data.SqlClient;   // <-- important
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;

namespace POS.API.Helpers
{
    public class HangfireCleanupService
    {
        private readonly string _connString;
        private readonly ILogger<HangfireCleanupService> _logger;

        public HangfireCleanupService(IConfiguration configuration, ILogger<HangfireCleanupService> logger)
        {
            _connString = configuration.GetConnectionString("DbConnectionString");
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        [Queue("cleanup")]
        [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 300, 900 })]
        [DisableConcurrentExecution(3600)]
        public async Task CleanupOldJobs()
        {
            try
            {
                using var conn = new SqlConnection(_connString);
                await conn.OpenAsync();

                var sql = @"
                    DELETE FROM [HangFire].[Job]
                    WHERE StateName = 'Succeeded'
                      AND CreatedAt < DATEADD(DAY, -1, GETUTCDATE());

                    DELETE FROM [HangFire].[JobParameter]
                    WHERE JobId NOT IN (SELECT Id FROM [HangFire].[Job]);

                    DELETE FROM [HangFire].[State]
                    WHERE JobId NOT IN (SELECT Id FROM [HangFire].[Job]);

                    DELETE FROM [HangFire].[Hash]
                    WHERE ExpireAt IS NOT NULL AND ExpireAt < GETUTCDATE();

                    DELETE FROM [HangFire].[Set]
                    WHERE ExpireAt IS NOT NULL AND ExpireAt < GETUTCDATE();
                    ";

                await conn.ExecuteAsync(sql);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during Hangfire cleanup");
            }
        }
    }
}
