using System;

namespace POS.Data.Entities
{
    /// <summary>
    /// Sync log for audit trail of synchronization operations
    /// </summary>
    public class SyncLog
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public string DeviceId { get; set; }
        public SyncDirection Direction { get; set; }
        public DateTime StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public int RecordsSynced { get; set; } = 0;
        public int RecordsConflicted { get; set; } = 0;
        public int RecordsFailed { get; set; } = 0;
        public SyncLogStatus Status { get; set; }
        public string ErrorMessage { get; set; }
    }

    public enum SyncDirection
    {
        Push,
        Pull,
        Bidirectional
    }

    public enum SyncLogStatus
    {
        InProgress,
        Completed,
        Failed,
        PartialSuccess
    }
}
