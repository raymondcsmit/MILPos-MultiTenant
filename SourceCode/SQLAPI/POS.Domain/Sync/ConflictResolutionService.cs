using POS.Data.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace POS.Domain.Sync
{
    /// <summary>
    /// Service for detecting and resolving conflicts during synchronization
    /// </summary>
    public class ConflictResolutionService
    {
        /// <summary>
        /// Detect if there's a conflict between local and remote changes
        /// </summary>
        public ConflictResolution DetectConflict(EntityChange local, EntityChange remote)
        {
            // No conflict if versions match
            if (local.Version == remote.Version)
            {
                return new ConflictResolution { HasConflict = false };
            }

            // Conflict exists
            return new ConflictResolution
            {
                HasConflict = true,
                LocalChange = local,
                RemoteChange = remote,
                ConflictType = DetermineConflictType(local, remote)
            };
        }

        /// <summary>
        /// Resolve a conflict using the specified strategy
        /// </summary>
        public async Task<EntityChange> ResolveConflict(
            ConflictResolution conflict,
            ConflictStrategy strategy)
        {
            switch (strategy)
            {
                case ConflictStrategy.ServerWins:
                    return conflict.RemoteChange;

                case ConflictStrategy.ClientWins:
                    return conflict.LocalChange;

                case ConflictStrategy.LastWriteWins:
                    return conflict.LocalChange.Timestamp > conflict.RemoteChange.Timestamp
                        ? conflict.LocalChange
                        : conflict.RemoteChange;

                case ConflictStrategy.MergeFields:
                    return await MergeChanges(conflict.LocalChange, conflict.RemoteChange);

                default:
                    // Default to server wins
                    return conflict.RemoteChange;
            }
        }

        /// <summary>
        /// Merge changes from local and remote
        /// </summary>
        private async Task<EntityChange> MergeChanges(EntityChange local, EntityChange remote)
        {
            // Deserialize both versions
            var localData = JsonSerializer.Deserialize<Dictionary<string, object>>(local.Data);
            var remoteData = JsonSerializer.Deserialize<Dictionary<string, object>>(remote.Data);

            // Merge: take non-null values, prefer newer timestamp for conflicts
            var merged = new Dictionary<string, object>();
            var allKeys = localData.Keys.Union(remoteData.Keys);

            foreach (var key in allKeys)
            {
                if (localData.ContainsKey(key) && remoteData.ContainsKey(key))
                {
                    // Both have value - use newer
                    merged[key] = local.Timestamp > remote.Timestamp
                        ? localData[key]
                        : remoteData[key];
                }
                else
                {
                    // Only one has value
                    merged[key] = localData.ContainsKey(key) ? localData[key] : remoteData[key];
                }
            }

            return new EntityChange
            {
                EntityType = local.EntityType,
                EntityId = local.EntityId,
                ChangeType = ChangeType.Update,
                Data = JsonSerializer.Serialize(merged),
                Timestamp = DateTime.UtcNow,
                Version = Math.Max(local.Version, remote.Version) + 1
            };
        }

        /// <summary>
        /// Determine the type of conflict
        /// </summary>
        private ConflictType DetermineConflictType(EntityChange local, EntityChange remote)
        {
            if (local.ChangeType == ChangeType.Update && remote.ChangeType == ChangeType.Update)
                return ConflictType.UpdateUpdate;

            if (local.ChangeType == ChangeType.Update && remote.ChangeType == ChangeType.Delete)
                return ConflictType.UpdateDelete;

            if (local.ChangeType == ChangeType.Delete && remote.ChangeType == ChangeType.Update)
                return ConflictType.DeleteUpdate;

            return ConflictType.UpdateUpdate;
        }
    }

    /// <summary>
    /// Represents a conflict resolution result
    /// </summary>
    public class ConflictResolution
    {
        public bool HasConflict { get; set; }
        public EntityChange LocalChange { get; set; }
        public EntityChange RemoteChange { get; set; }
        public ConflictType ConflictType { get; set; }
    }

    /// <summary>
    /// Types of conflicts
    /// </summary>
    public enum ConflictType
    {
        UpdateUpdate,  // Both sides updated same record
        UpdateDelete,  // One updated, one deleted
        DeleteUpdate,  // One deleted, one updated
        InsertInsert   // Both inserted with same ID (rare)
    }

    /// <summary>
    /// Conflict resolution strategies
    /// </summary>
    public enum ConflictStrategy
    {
        ServerWins,      // Cloud version wins
        ClientWins,      // Desktop version wins
        LastWriteWins,   // Newest timestamp wins
        MergeFields      // Merge field by field
    }
}
