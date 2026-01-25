using System;

namespace POS.Domain.FBR.DTOs
{
    /// <summary>
    /// Response DTO from FBR API after invoice submission
    /// </summary>
    public class FBRInvoiceResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public string InvoiceNumber { get; set; } // FBR-assigned invoice number
        public string USIN { get; set; } // Unique Sales Invoice Number
        public string QRCodeData { get; set; } // QR code content
        public string QRCodeBase64 { get; set; } // Base64 encoded QR code image
        public DateTime? SubmittedAt { get; set; }
        public string ErrorCode { get; set; }
        public string ErrorDetails { get; set; }
    }

    /// <summary>
    /// Response for invoice cancellation
    /// </summary>
    public class FBRCancelResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime? CancelledAt { get; set; }
    }

    /// <summary>
    /// Response for invoice verification
    /// </summary>
    public class FBRVerificationResponse
    {
        public bool IsValid { get; set; }
        public string InvoiceNumber { get; set; }
        public string USIN { get; set; }
        public string Status { get; set; } // "Valid", "Invalid", "Cancelled"
        public DateTime? SubmittedAt { get; set; }
        public decimal TotalAmount { get; set; }
        public string SellerSTRN { get; set; }
    }
}
