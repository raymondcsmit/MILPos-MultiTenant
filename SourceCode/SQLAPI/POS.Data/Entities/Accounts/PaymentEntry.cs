using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data.Entities.Accounts;
public class PaymentEntry
{
    public Guid Id { get; set; }
    public Guid TransactionId { get; set; }
    public Guid BranchId { get; set; }
    public ACCPaymentMethod PaymentMethod { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }
    public DateTime PaymentDate { get; set; }
    [MaxLength(100)]
    public string ReferenceNumber { get; set; } = string.Empty;
    [MaxLength(500)]
    public string Narration { get; set; } = string.Empty;
    public ACCPaymentStatus Status { get; set; } = ACCPaymentStatus.Completed;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    // Navigation Properties
    [ForeignKey("TransactionId")]
    public virtual Transaction Transaction { get; set; } = null!;
    [ForeignKey("BranchId")]
    public virtual Location Branch { get; set; } = null!;
    //public TransactionType TransactionType { get; set; }
}
