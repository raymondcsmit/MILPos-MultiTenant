using System;
using System.ComponentModel.DataAnnotations;

namespace ApiAndQueriesProfiler
{
    public class ApiRequestLog
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public string CorrelationId { get; set; }
        public string Method { get; set; }
        public string Path { get; set; }
        public string QueryString { get; set; }
        public int StatusCode { get; set; }
        public long DurationMs { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public string IpAddress { get; set; }
        public string UserAgent { get; set; }
    }
}
