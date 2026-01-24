using Microsoft.Extensions.Logging;
using POS.Data;
using POS.Data.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace POS.Domain.Sync
{
    /// <summary>
    /// Core synchronization engine - orchestrates pull and push operations
    /// </summary>
    public class SyncEngine
    {
        private readonly ChangeTrackingService _changeTracker;
        private readonly ConflictResolutionService _conflictResolver;
        private readonly CloudApiClient _cloudApiClient;
        private readonly POSDbContext _context;
        private readonly ILogger<SyncEngine> _logger;
        private readonly IDeviceIdentifier _deviceIdentifier;

        public SyncEngine(
            ChangeTrackingService changeTracker,
            ConflictResolutionService conflictResolver,
            CloudApiClient cloudApiClient,
            POSDbContext context,
            ILogger<SyncEngine> logger,
            IDeviceIdentifier deviceIdentifier)
        {
            _changeTracker = changeTracker;
            _conflictResolver = conflictResolver;
            _cloudApiClient = cloudApiClient;
            _context = context;
            _logger = logger;
            _deviceIdentifier = deviceIdentifier;
        }

        /// <summary>
        /// Main synchronization method
        /// </summary>
        public async Task<SyncResult> SynchronizeAsync(SyncOptions options = null)
        {
            options ??= new SyncOptions();
            var result = new SyncResult
            {
                StartedAt = DateTime.UtcNow,
                DeviceId = _deviceIdentifier.GetDeviceId()
            };

            try
            {
                _logger.LogInformation("Starting synchronization - Direction: {Direction}", options.Direction);

                // 1. Pull changes from cloud
                if (options.Direction == SyncDirection.Pull ||
                    options.Direction == SyncDirection.Bidirectional)
                {
                    await PullChangesAsync(result);
                }

                // 2. Push local changes to cloud
                if (options.Direction == SyncDirection.Push ||
                    options.Direction == SyncDirection.Bidirectional)
                {
                    await PushChangesAsync(result);
                }

                result.CompletedAt = DateTime.UtcNow;
                result.Status = SyncLogStatus.Completed;

                _logger.LogInformation("Synchronization completed - Synced: {Synced}, Conflicts: {Conflicts}, Failed: {Failed}",
                    result.RecordsSynced, result.RecordsConflicted, result.RecordsFailed);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Synchronization failed");
                result.Status = SyncLogStatus.Failed;
                result.ErrorMessage = ex.Message;
            }

            await LogSyncResult(result);
            return result;
        }

        /// <summary>
        /// Pull changes from cloud to desktop
        /// </summary>
        private async Task PullChangesAsync(SyncResult result)
        {
            // Get list of entity types to sync
            var entityTypes = new[] { "Product", "Customer", "SalesOrder", "Supplier", "Category" };

            foreach (var entityType in entityTypes)
            {
                try
                {
                    var metadata = await _changeTracker.GetSyncMetadata(entityType);
                    var lastSync = metadata?.LastPullSync ?? DateTime.MinValue;

                    _logger.LogInformation("Pulling {EntityType} changes since {LastSync}", entityType, lastSync);

                    // Call standard REST API with modifiedSince filter
                    var cloudRecords = await _cloudApiClient.GetEntitiesAsync<BaseEntity>(entityType, lastSync);

                    foreach (var cloudRecord in cloudRecords)
                    {
                        // Check if we have local changes for this record
                        var localRecord = await GetLocalRecord(entityType, cloudRecord.Id);

                        if (localRecord != null && localRecord.ModifiedDate > lastSync)
                        {
                            // Conflict: both sides modified
                            var localChange = new EntityChange
                            {
                                EntityType = entityType,
                                EntityId = localRecord.Id,
                                Data = JsonSerializer.Serialize(localRecord),
                                Timestamp = localRecord.ModifiedDate,
                                Version = localRecord.SyncVersion
                            };

                            var remoteChange = new EntityChange
                            {
                                EntityType = entityType,
                                EntityId = cloudRecord.Id,
                                Data = JsonSerializer.Serialize(cloudRecord),
                                Timestamp = cloudRecord.ModifiedDate,
                                Version = cloudRecord.SyncVersion
                            };

                            var conflict = _conflictResolver.DetectConflict(localChange, remoteChange);
                            if (conflict.HasConflict)
                            {
                                var resolved = await _conflictResolver.ResolveConflict(
                                    conflict,
                                    ConflictStrategy.ServerWins); // Default: Cloud wins

                                if (resolved != null)
                                {
                                    await ApplyToLocalDb(resolved);
                                    result.RecordsConflicted++;
                                }
                                continue;
                            }
                        }

                        // No conflict, apply cloud version to local
                        await ApplyToLocalDb(new EntityChange
                        {
                            EntityType = entityType,
                            EntityId = cloudRecord.Id,
                            Data = JsonSerializer.Serialize(cloudRecord),
                            ChangeType = localRecord == null ? ChangeType.Insert : ChangeType.Update
                        });
                        result.RecordsSynced++;
                    }

                    // Update sync metadata
                    await _changeTracker.UpdateSyncMetadata(entityType, DateTime.UtcNow, isPull: true);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to pull {EntityType}", entityType);
                    result.RecordsFailed++;
                }
            }
        }

        /// <summary>
        /// Push local changes to cloud
        /// </summary>
        private async Task PushChangesAsync(SyncResult result)
        {
            var metadata = await _changeTracker.GetSyncMetadata("All");
            var lastSync = metadata?.LastPushSync ?? DateTime.MinValue;
            
            var localChanges = await _changeTracker.GetLocalChanges(lastSync);

            if (!localChanges.Any())
            {
                _logger.LogInformation("No local changes to push");
                return;
            }

            _logger.LogInformation("Pushing {Count} local changes", localChanges.Count);

            // Group changes by entity type
            var changesByType = localChanges.GroupBy(c => c.EntityType);

            foreach (var group in changesByType)
            {
                foreach (var change in group)
                {
                    try
                    {
                        switch (change.ChangeType)
                        {
                            case ChangeType.Insert:
                                var entity = JsonSerializer.Deserialize(change.Data, GetEntityType(change.EntityType));
                                await _cloudApiClient.CreateEntityAsync(change.EntityType, entity);
                                break;

                            case ChangeType.Update:
                                var updateEntity = JsonSerializer.Deserialize(change.Data, GetEntityType(change.EntityType));
                                var updateResult = await _cloudApiClient.UpdateEntityAsync(
                                    change.EntityType,
                                    change.EntityId,
                                    updateEntity);

                                if (updateResult.IsConflict)
                                {
                                    // Server has newer version
                                    _logger.LogWarning("Conflict detected for {EntityType}:{EntityId}", change.EntityType, change.EntityId);
                                    result.RecordsConflicted++;
                                    continue;
                                }
                                break;

                            case ChangeType.Delete:
                                await _cloudApiClient.DeleteEntityAsync(change.EntityType, change.EntityId);
                                break;
                        }

                        await _changeTracker.MarkAsSynced(new List<Guid> { change.EntityId }, change.EntityType);
                        result.RecordsSynced++;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to push {EntityType}:{EntityId}", change.EntityType, change.EntityId);
                        result.RecordsFailed++;
                    }
                }
            }
        }

        /// <summary>
        /// Apply change to local database
        /// </summary>
        private async Task ApplyToLocalDb(EntityChange change)
        {
            var entityType = GetEntityType(change.EntityType);
            var entity = JsonSerializer.Deserialize(change.Data, entityType) as BaseEntity;

            if (entity == null) return;

            switch (change.ChangeType)
            {
                case ChangeType.Insert:
                case ChangeType.Update:
                    _context.Entry(entity).State = Microsoft.EntityFrameworkCore.EntityState.Modified;
                    break;

                case ChangeType.Delete:
                    _context.Entry(entity).State = Microsoft.EntityFrameworkCore.EntityState.Deleted;
                    break;
            }

            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Get local record by entity type and ID
        /// </summary>
        private async Task<BaseEntity> GetLocalRecord(string entityType, Guid id)
        {
            var dbSetProperty = _context.GetType().GetProperty(entityType + "s");
            if (dbSetProperty == null) return null;

            var dbSet = dbSetProperty.GetValue(_context);
            if (dbSet == null) return null;

            var queryable = (System.Linq.IQueryable<BaseEntity>)dbSet;
            return await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(
                queryable, e => e.Id == id);
        }

        /// <summary>
        /// Get entity type from string name
        /// </summary>
        private Type GetEntityType(string entityTypeName)
        {
            return Type.GetType($"POS.Data.Entities.{entityTypeName}, POS.Data")
                ?? Type.GetType($"POS.Data.{entityTypeName}, POS.Data");
        }

        /// <summary>
        /// Log sync result to database
        /// </summary>
        private async Task LogSyncResult(SyncResult result)
        {
            var syncLog = new SyncLog
            {
                Id = Guid.NewGuid(),
                TenantId = _context.ChangeTracker.Entries<BaseEntity>().FirstOrDefault()?.Entity.TenantId ?? Guid.Empty,
                DeviceId = result.DeviceId,
                Direction = SyncDirection.Bidirectional,
                StartedAt = result.StartedAt,
                CompletedAt = result.CompletedAt,
                RecordsSynced = result.RecordsSynced,
                RecordsConflicted = result.RecordsConflicted,
                RecordsFailed = result.RecordsFailed,
                Status = result.Status,
                ErrorMessage = result.ErrorMessage
            };

            _context.SyncLogs.Add(syncLog);
            await _context.SaveChangesAsync();
        }
    }

    /// <summary>
    /// Sync options
    /// </summary>
    public class SyncOptions
    {
        public SyncDirection Direction { get; set; } = SyncDirection.Bidirectional;
        public ConflictStrategy? ConflictStrategy { get; set; } = Sync.ConflictStrategy.ServerWins;
    }

    /// <summary>
    /// Sync result
    /// </summary>
    public class SyncResult
    {
        public string DeviceId { get; set; }
        public DateTime StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public int RecordsSynced { get; set; }
        public int RecordsConflicted { get; set; }
        public int RecordsFailed { get; set; }
        public SyncLogStatus Status { get; set; }
        public string ErrorMessage { get; set; }
    }
}
