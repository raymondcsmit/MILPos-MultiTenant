using System;

namespace POS.Data.Entities
{
    /// <summary>
    /// Represents a change to an entity for synchronization
    /// </summary>
    public class EntityChange
    {
        public string EntityType { get; set; }
        public Guid EntityId { get; set; }
        public ChangeType ChangeType { get; set; }
        public string Data { get; set; }
        public DateTime Timestamp { get; set; }
        public long Version { get; set; }
    }

    public enum ChangeType
    {
        Insert,
        Update,
        Delete
    }
}
