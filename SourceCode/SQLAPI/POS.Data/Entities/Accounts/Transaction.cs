using POS.Data.Entities.Accounts;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data.Entities;
public class Transaction : BaseEntity
{
    public Guid Id { get; set; }
    [Required]
    [MaxLength(20)]
    public string TransactionNumber { get; set; } = string.Empty;
    public TransactionType TransactionType { get; set; }
    public Guid BranchId { get; set; }
    public DateTime TransactionDate { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal SubTotal { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal DiscountAmount { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal FlatDiscount { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal TaxAmount { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal RoundOffAmount { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalAmount { get; set; }
    [MaxLength(500)]
    public string Narration { get; set; } = string.Empty;
    [MaxLength(50)]
    public string ReferenceNumber { get; set; } = string.Empty;
    public TransactionStatus Status { get; set; } = TransactionStatus.Pending;
    public ACCPaymentStatus PaymentStatus { get; set; } = ACCPaymentStatus.Pending;
    [Column(TypeName = "decimal(18,2)")]
    public decimal PaidAmount { get; set; } = 0;
    [Column(TypeName = "decimal(18,2)")]
    public decimal ReturnItemsAmount { get; set; } = 0;
    [Column(TypeName = "decimal(18,2)")]
    public decimal BalanceAmount { get; set; } = 0;
    // Navigation Properties
    [ForeignKey("BranchId")]
    public virtual Location Branch { get; set; } = null!;
    public Guid FinancialYearId { get; set; }
    [ForeignKey("FinancialYearId")]
    public FinancialYear FinancialYear { get; set; }
    public virtual ICollection<TransactionItem> TransactionItems { get; set; } = new List<TransactionItem>();
    public virtual ICollection<AccountingEntry> AccountingEntries { get; set; } = new List<AccountingEntry>();
    public virtual ICollection<TaxEntry> TaxEntries { get; set; } = new List<TaxEntry>();
    public virtual ICollection<PaymentEntry> PaymentEntries { get; set; } = new List<PaymentEntry>();
}
