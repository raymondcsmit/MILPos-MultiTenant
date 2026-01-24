using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data.Entities.Accounts;
public class AccountingEntry : BaseEntity
{
    public Guid Id { get; set; }

    public Guid TransactionId { get; set; }

    public Guid BranchId { get; set; }

    public Guid DebitLedgerAccountId { get; set; }

    public Guid CreditLedgerAccountId { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    [MaxLength(500)]
    public string Narration { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Reference { get; set; } = string.Empty;

    public DateTime EntryDate { get; set; }

    public EntryType EntryType { get; set; }
    public Guid FinancialYearId { get; set; }
    [ForeignKey("FinancialYearId")]
    public FinancialYear FinancialYear { get; set; }

    // Navigation Properties
    [ForeignKey("TransactionId")]
    public virtual Transaction Transaction { get; set; } = null!;
    [ForeignKey("BranchId")]
    public virtual Location Branch { get; set; } = null!;
    [ForeignKey("DebitLedgerAccountId")]
    public virtual LedgerAccount DebitLedgerAccount { get; set; } = null!;
    [ForeignKey("CreditLedgerAccountId")]
    public virtual LedgerAccount CreditLedgerAccount { get; set; } = null!;

}


