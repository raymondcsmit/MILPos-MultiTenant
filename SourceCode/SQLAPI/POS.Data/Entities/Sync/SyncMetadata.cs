using System;

namespace POS.Data.Entities
{
    /// <summary>
    /// Sync metadata for tracking synchronization state (Desktop only)
    /// </summary>
    public class SyncMetadata
    {
        public int Id { get; set; }
        public string EntityType { get; set; }
        public DateTime LastPullSync { get; set; }
        public DateTime LastPushSync { get; set; }
        public DateTime LastSuccessfulSync { get; set; }
        public int PendingChanges { get; set; } = 0;
    }
}
