using System;

namespace POS.Data.Entities.FBR
{
    /// <summary>
    /// FBR submission status for sales invoices
    /// </summary>
    public enum FBRSubmissionStatus
    {
        /// <summary>
        /// Invoice not yet submitted to FBR
        /// </summary>
        NotSubmitted = 0,
        
        /// <summary>
        /// Invoice queued for FBR submission
        /// </summary>
        Queued = 1,
        
        /// <summary>
        /// Currently being submitted to FBR
        /// </summary>
        Submitting = 2,
        
        /// <summary>
        /// Successfully submitted to FBR
        /// </summary>
        Submitted = 3,
        
        /// <summary>
        /// FBR acknowledged receipt
        /// </summary>
        Acknowledged = 4,
        
        /// <summary>
        /// Submission failed
        /// </summary>
        Failed = 5,
        
        /// <summary>
        /// Too many failures, requires manual intervention
        /// </summary>
        RequiresManualReview = 6,
        
        /// <summary>
        /// Invoice cancelled/voided
        /// </summary>
        Cancelled = 7
    }
}
