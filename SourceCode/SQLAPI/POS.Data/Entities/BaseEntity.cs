using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data
{
    public abstract class BaseEntity : ISoftDelete
    {
        public Guid Id { get; set; }
        
        // Multi-tenant support
        public Guid TenantId { get; set; }

        private DateTime _createdDate;
        public DateTime CreatedDate
        {
            get => _createdDate;
            set => _createdDate = value;
        }
        public Guid CreatedBy { get; set; }

        [ForeignKey("CreatedBy")]
        public User CreatedByUser { get; set; }

        private DateTime _modifiedDate;
        public DateTime ModifiedDate
        {
            get => _modifiedDate;
            set => _modifiedDate = value;
        }
        public Guid ModifiedBy { get; set; }
        private DateTime? _deletedDate;
        public DateTime? DeletedDate
        {
            get => _deletedDate;
            set => _deletedDate = value;
        }
        public Guid? DeletedBy { get; set; }
        
        // Sync tracking fields for data synchronization
        public long SyncVersion { get; set; } = 0;
        public DateTime? LastSyncedAt { get; set; }
        
        [NotMapped]
        public ObjectState ObjectState { get; set; }
        public bool IsDeleted { get; set; } = false;
      
    }
}
