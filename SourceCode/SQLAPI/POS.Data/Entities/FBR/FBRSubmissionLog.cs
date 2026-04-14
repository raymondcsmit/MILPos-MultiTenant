using POS.Data.Entities;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data.Entities.FBR
{
    /// <summary>
    /// Audit log for all FBR submission attempts
    /// Tracks every attempt to submit an invoice to FBR for compliance and debugging
    /// </summary>
    public class FBRSubmissionLog : BaseEntity
    {
        [Key]
        public Guid Id { get; set; }
        
        [Required]
        public Guid SalesOrderId { get; set; }
        
        [Required]
        public DateTime AttemptedAt { get; set; }
        
        [Required]
        public FBRSubmissionStatus Status { get; set; }
        
        public string RequestPayload { get; set; } // JSON sent to FBR
        
        public string ResponsePayload { get; set; } // JSON received from FBR
        
        public int HttpStatusCode { get; set; }
        
        [MaxLength(1000)]
        public string ErrorMessage { get; set; }
        
        public TimeSpan ResponseTime { get; set; }
        
        [MaxLength(50)]
        public string SubmittedBy { get; set; } // "BackgroundWorker" or "Manual" or username
        
        // Navigation
        [ForeignKey("SalesOrderId")]
        public virtual SalesOrder SalesOrder { get; set; }
    }
}
