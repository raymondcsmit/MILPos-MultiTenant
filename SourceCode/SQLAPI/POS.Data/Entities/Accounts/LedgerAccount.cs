using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data.Entities.Accounts;
public class LedgerAccount : BaseEntity
{

    public Guid Id { get; set; }

    [Required]
    [MaxLength(10)]
    public string AccountCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string AccountName { get; set; } = string.Empty;

    public AccountType AccountType { get; set; }

    public AccountGroup AccountGroup { get; set; }

    public Guid? ParentAccountId { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal OpeningBalance { get; set; }

    public bool IsActive { get; set; } = true;

    public bool IsTemporary { get; set; } = false;
    public bool IsSystem { get; set; } = true;

    // Navigation Properties
    [ForeignKey("ParentAccountId")]
    public virtual LedgerAccount ParentAccount { get; set; } = null;
    public virtual ICollection<LedgerAccount> SubAccounts { get; set; } = new List<LedgerAccount>();
    public virtual ICollection<AccountingEntry> DebitEntries { get; set; } = new List<AccountingEntry>();
    public virtual ICollection<AccountingEntry> CreditEntries { get; set; } = new List<AccountingEntry>();
}


