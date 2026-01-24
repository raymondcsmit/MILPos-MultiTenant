using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data.Entities.Accounts;
public class LoanDetail : BaseEntity
{
    public Guid Id { get; set; } 
    public Guid LoanAccountId { get; set; }
    [ForeignKey("LoanAccountId")]
    public LedgerAccount LoanAccount { get; set; }
    public Guid LoanAccountInterestExpenseId { get; set; }
    [ForeignKey("LoanAccountInterestExpenseId")]
    public LedgerAccount LoanAccountInterestExpense { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal LoanAmount { get; set; }
    public string LenderName { get; set; }
    public DateTime LoanDate { get; set; }
    public string Narration { get; set; }
    public Guid BranchId { get; set; }
    [ForeignKey("BranchId")]
    public virtual Location Branch { get; set; } = null!;
    public string LoanNumber { get; set; }
    public ICollection<LoanRepayment> LoanRepayments { get; set; } = new List<LoanRepayment>();
}