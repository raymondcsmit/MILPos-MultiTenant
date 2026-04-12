using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace ApiAndQueriesProfiler
{
    public class ProfilerBackgroundService : BackgroundService
    {
        private readonly ProfilerLogChannel _channel;
        private readonly IServiceProvider _serviceProvider;

        public ProfilerBackgroundService(ProfilerLogChannel channel, IServiceProvider serviceProvider)
        {
            _channel = channel;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Ensure Database and Tables are created at startup
            using (var scope = _serviceProvider.CreateScope())
            {
                var dbContext = scope.ServiceProvider.GetRequiredService<ProfilerDbContext>();
                try
                {
                    await dbContext.Database.EnsureCreatedAsync(stoppingToken);
                    var dbCreator = dbContext.Database.GetService<IRelationalDatabaseCreator>();
                    await dbCreator.CreateTablesAsync(stoppingToken);
                }
                catch
                {
                    // Ignore exceptions if the database or tables already exist
                }
            }

            var batch = new List<object>();

            while (!stoppingToken.IsCancellationRequested)
            {
                // Wait for data
                if (await _channel.ReadAllAsync(stoppingToken).GetAsyncEnumerator(stoppingToken).MoveNextAsync())
                {
                    // Read all available items up to a batch size
                    while (batch.Count < 100 && _channel.TryRead(out var item))
                    {
                        batch.Add(item);
                    }

                    if (batch.Count > 0)
                    {
                        try
                        {
                            using var scope = _serviceProvider.CreateScope();
                            var dbContext = scope.ServiceProvider.GetRequiredService<ProfilerDbContext>();

                            foreach (var log in batch)
                            {
                                if (log is ApiRequestLog reqLog) dbContext.ApiRequestLogs.Add(reqLog);
                                if (log is EfQueryLog queryLog) dbContext.EfQueryLogs.Add(queryLog);
                            }

                            await dbContext.SaveChangesAsync(stoppingToken);
                        }
                        catch
                        {
                            // Ignore exceptions to not crash background service
                        }
                        finally
                        {
                            batch.Clear();
                        }
                    }
                }
            }
        }
    }
}