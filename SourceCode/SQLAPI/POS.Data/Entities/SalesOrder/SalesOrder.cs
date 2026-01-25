using POS.Data.Entities;
using POS.Data.Entities.FBR;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data
{
    public class SalesOrder : BaseEntity
    {
        public Guid Id { get; set; }
        public string OrderNumber { get; set; }
        public string Note { get; set; }
        public string SaleReturnNote { get; set; }
        public string TermAndCondition { get; set; }
        public bool IsSalesOrderRequest { get; set; }
        public DateTime SOCreatedDate { get; set; }
        public SalesOrderStatus Status { get; set; } = SalesOrderStatus.Not_Return;
        public DateTime DeliveryDate { get; set; }
        public SalesDeliveryStatus DeliveryStatus { get; set; }
        public Guid CustomerId { get; set; }
        public Customer Customer { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmount { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalTax { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalDiscount { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal FlatDiscount { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalPaidAmount { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalRoundOff { get; set; } = 0;
        public decimal TotalRefundAmount { get; set; } = 0;
        public PaymentStatus PaymentStatus { get; set; }
        public Guid LocationId { get; set; }
        [ForeignKey("LocationId")]
        public Location Location { get; set; }
        public List<SalesOrderItem> SalesOrderItems { get; set; }
        public List<SalesOrderPayment> SalesOrderPayments { get; set; }

        // FBR-Specific Fields
        public string BuyerNTN { get; set; } // National Tax Number (optional for retail)
        public string BuyerCNIC { get; set; } // CNIC for individuals
        public string BuyerName { get; set; } // Required for FBR
        public string BuyerPhoneNumber { get; set; } // Required
        public string BuyerAddress { get; set; }
        public string SaleType { get; set; } // "Retail", "Wholesale", "Export"
        
        // FBR Submission Status
        public FBRSubmissionStatus FBRStatus { get; set; } = FBRSubmissionStatus.NotSubmitted;
        public string FBRInvoiceNumber { get; set; } // FBR-assigned number
        public string FBRUSIN { get; set; } // Unique Sales Invoice Number from FBR
        public DateTime? FBRSubmittedAt { get; set; }
        public DateTime? FBRAcknowledgedAt { get; set; }
        public string FBRQRCodeData { get; set; } // QR code content
        public string FBRQRCodeImagePath { get; set; } // Path to QR image file
        public int FBRRetryCount { get; set; } = 0;
        public DateTime? FBRNextRetryAt { get; set; }
        public string FBRErrorMessage { get; set; }
        public string FBRResponseJson { get; set; } // Full FBR response for audit
        
        // Navigation
        public virtual ICollection<FBRSubmissionLog> FBRSubmissionLogs { get; set; }
    }
}
