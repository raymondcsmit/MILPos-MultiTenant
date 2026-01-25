using POS.Data.Entities;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data.Entities.FBR
{
    /// <summary>
    /// FBR (Federal Board of Revenue) configuration for tenant
    /// Stores API credentials and settings for FBR integration
    /// </summary>
    public class FBRConfiguration : BaseEntity
    {
        [Key]
        public Guid Id { get; set; }
        
        // FBR Credentials
        [Required]
        [MaxLength(100)]
        public string ClientId { get; set; }
        
        [Required]
        [MaxLength(500)]
        public string ClientSecret { get; set; } // Encrypted in database
        
        [Required]
        [MaxLength(500)]
        public string FBRKey { get; set; } // Encrypted in database
        
        [Required]
        [MaxLength(20)]
        public string POSID { get; set; } // POS Machine ID
        
        [Required]
        [MaxLength(20)]
        public string BranchCode { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string STRN { get; set; } // Sales Tax Registration Number (format: 1234567-8)
        
        // API Configuration
        [Required]
        [MaxLength(200)]
        public string ApiBaseUrl { get; set; } // Sandbox or Production URL
        
        public bool IsEnabled { get; set; } = false;
        
        public bool IsTestMode { get; set; } = true; // Sandbox vs Production
        
        public bool AutoSubmitInvoices { get; set; } = true;
        
        // Token Management
        [MaxLength(1000)]
        public string CurrentAccessToken { get; set; } // Encrypted
        
        public DateTime? TokenExpiresAt { get; set; }
        
        public DateTime? LastTokenRefresh { get; set; }
        
        // Retry Configuration
        public int MaxRetryAttempts { get; set; } = 5;
        
        public int RetryDelaySeconds { get; set; } = 60; // Initial delay
        
        public int MaxRetryDelaySeconds { get; set; } = 3600; // Max 1 hour
        
        // Monitoring & Statistics
        public DateTime? LastSuccessfulSubmission { get; set; }
        
        public int TotalSubmissionsToday { get; set; } = 0;
        
        public int FailedSubmissionsToday { get; set; } = 0;
    }
}
