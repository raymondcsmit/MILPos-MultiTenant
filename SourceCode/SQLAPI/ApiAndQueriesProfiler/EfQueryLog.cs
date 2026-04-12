using System;
using System.ComponentModel.DataAnnotations;

namespace ApiAndQueriesProfiler
{
    public class EfQueryLog
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public string CorrelationId { get; set; }
        public string CommandText { get; set; }
        public string Parameters { get; set; }
        public long DurationMs { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
