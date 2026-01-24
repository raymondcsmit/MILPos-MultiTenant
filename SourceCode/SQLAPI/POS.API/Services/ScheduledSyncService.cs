using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using POS.Data.Entities;
using POS.Domain.Sync;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace POS.API.Services
{
    /// <summary>
    /// Background service for scheduled synchronization (Desktop only)
    /// </summary>
    public class ScheduledSyncService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IConfiguration _configuration;
        private readonly ILogger<ScheduledSyncService> _logger;
        private readonly int _syncIntervalMinutes;

        public ScheduledSyncService(
            IServiceProvider serviceProvider,
            IConfiguration configuration,
            ILogger<ScheduledSyncService> logger)
        {
            _serviceProvider = serviceProvider;
            _configuration = configuration;
            _logger = logger;

            // Get sync interval from configuration (default: 5 minutes)
            _syncIntervalMinutes = configuration.GetValue<int>("SyncSettings:SyncIntervalMinutes", 5);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Only run in Desktop mode
            var deploymentMode = _configuration["DeploymentSettings:DeploymentMode"];
            if (deploymentMode != "Desktop")
            {
                _logger.LogInformation("ScheduledSyncService disabled - not in Desktop mode");
                return;
            }

            _logger.LogInformation("ScheduledSyncService started - Interval: {Interval} minutes", _syncIntervalMinutes);

            // Wait 30 seconds before first sync to allow app to fully start
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    _logger.LogInformation("Starting scheduled sync...");

                    // Create a scope to resolve scoped services
                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var syncEngine = scope.ServiceProvider.GetRequiredService<SyncEngine>();
                        
                        var result = await syncEngine.SynchronizeAsync(new SyncOptions
                        {
                            Direction = SyncDirection.Bidirectional
                        });

                        _logger.LogInformation(
                            "Scheduled sync completed - Status: {Status}, Synced: {Synced}, Conflicts: {Conflicts}, Failed: {Failed}",
                            result.Status, result.RecordsSynced, result.RecordsConflicted, result.RecordsFailed);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Scheduled sync failed");
                }

                // Wait for next sync interval
                await Task.Delay(TimeSpan.FromMinutes(_syncIntervalMinutes), stoppingToken);
            }

            _logger.LogInformation("ScheduledSyncService stopped");
        }
    }
}
