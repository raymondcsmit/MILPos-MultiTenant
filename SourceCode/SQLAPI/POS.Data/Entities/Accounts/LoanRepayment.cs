using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data.Entities.Accounts;
public class LoanRepayment : BaseEntity
{
    public Guid Id { get; set; }
    public Guid LoanDetailId { get; set; }
    [ForeignKey("LoanDetailId")]
    public LoanDetail LoanDetail { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal PricipalAmount { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal InterestAmount { get; set; }
    public DateTime PaymentDate { get; set; }
    public string Note { get; set; }
}
