using Microsoft.EntityFrameworkCore;
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
    /// Service for tracking changes to entities for synchronization
    /// </summary>
    public class ChangeTrackingService
    {
        private readonly POSDbContext _context;
        private readonly IDeviceIdentifier _deviceIdentifier;

        public ChangeTrackingService(POSDbContext context, IDeviceIdentifier deviceIdentifier)
        {
            _context = context;
            _deviceIdentifier = deviceIdentifier;
        }

        /// <summary>
        /// Get all local changes since a specific timestamp
        /// </summary>
        public async Task<List<EntityChange>> GetLocalChanges(DateTime? since = null)
        {
            var changes = new List<EntityChange>();
            var deviceId = _deviceIdentifier.GetDeviceId();

            // Get all entity types that inherit from BaseEntity
            var entityTypes = _context.Model.GetEntityTypes()
                .Where(t => typeof(BaseEntity).IsAssignableFrom(t.ClrType) 
                    && !t.ClrType.IsAbstract
                    && t.ClrType != typeof(SyncMetadata)
                    && t.ClrType != typeof(SyncLog))
                .ToList();

            foreach (var entityType in entityTypes)
            {
                var tableName = entityType.GetTableName();
                var clrType = entityType.ClrType;

                // Get DbSet for this entity type
                var dbSet = _context.GetType()
                    .GetProperty(entityType.ClrType.Name + "s")
                    ?.GetValue(_context);

                if (dbSet == null) continue;

                // Query for changed entities
                IQueryable<BaseEntity> query = (IQueryable<BaseEntity>)dbSet;

                if (since.HasValue)
                {
                    // Get entities modified since last sync
                    query = query.Where(e => e.ModifiedDate > since.Value || e.DeletedDate > since.Value);
                }
                else
                {
                    // Get all unsynced entities
                    query = query.Where(e => e.LastSyncedAt == null);
                }

                var changedEntities = await query.ToListAsync();

                foreach (var entity in changedEntities)
                {
                    changes.Add(new EntityChange
                    {
                        EntityType = clrType.Name,
                        EntityId = entity.Id,
                        ChangeType = entity.IsDeleted ? ChangeType.Delete :
                                     entity.CreatedDate == entity.ModifiedDate ? ChangeType.Insert :
                                     ChangeType.Update,
                        Data = JsonSerializer.Serialize(entity, entity.GetType()),
                        Timestamp = entity.ModifiedDate,
                        Version = entity.SyncVersion
                    });
                }
            }

            return changes;
        }

        /// <summary>
        /// Mark entities as synced
        /// </summary>
        public async Task MarkAsSynced(List<Guid> entityIds, string entityType)
        {
            var now = DateTime.UtcNow;
            
            // Get the DbSet for this entity type
            var dbSetProperty = _context.GetType().GetProperty(entityType + "s");
            if (dbSetProperty == null) return;

            var dbSet = dbSetProperty.GetValue(_context);
            if (dbSet == null) return;

            var queryable = (IQueryable<BaseEntity>)dbSet;
            var entities = await queryable.Where(e => entityIds.Contains(e.Id)).ToListAsync();

            foreach (var entity in entities)
            {
                entity.LastSyncedAt = now;
            }

            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Increment sync version for an entity
        /// </summary>
        public async Task IncrementVersion(Guid entityId, string entityType)
        {
            var dbSetProperty = _context.GetType().GetProperty(entityType + "s");
            if (dbSetProperty == null) return;

            var dbSet = dbSetProperty.GetValue(_context);
            if (dbSet == null) return;

            var queryable = (IQueryable<BaseEntity>)dbSet;
            var entity = await queryable.FirstOrDefaultAsync(e => e.Id == entityId);

            if (entity != null)
            {
                entity.SyncVersion++;
                await _context.SaveChangesAsync();
            }
        }

        /// <summary>
        /// Get last sync metadata for an entity type
        /// </summary>
        public async Task<SyncMetadata> GetSyncMetadata(string entityType)
        {
            return await _context.SyncMetadata
                .FirstOrDefaultAsync(m => m.EntityType == entityType);
        }

        /// <summary>
        /// Update sync metadata after successful sync
        /// </summary>
        public async Task UpdateSyncMetadata(string entityType, DateTime syncTime, bool isPull)
        {
            var metadata = await GetSyncMetadata(entityType);
            
            if (metadata == null)
            {
                metadata = new SyncMetadata
                {
                    EntityType = entityType,
                    LastPullSync = isPull ? syncTime : DateTime.MinValue,
                    LastPushSync = isPull ? DateTime.MinValue : syncTime,
                    LastSuccessfulSync = syncTime,
                    PendingChanges = 0
                };
                _context.SyncMetadata.Add(metadata);
            }
            else
            {
                if (isPull)
                    metadata.LastPullSync = syncTime;
                else
                    metadata.LastPushSync = syncTime;
                
                metadata.LastSuccessfulSync = syncTime;
            }

            await _context.SaveChangesAsync();
        }
    }
}
