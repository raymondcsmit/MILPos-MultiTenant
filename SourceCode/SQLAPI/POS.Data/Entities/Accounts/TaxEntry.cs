using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data.Entities.Accounts;
public class TaxEntry : BaseEntity
{
    public Guid Id { get; set; }
    public Guid TransactionId { get; set; }
    //public Guid TaxId { get; set; }
    public Guid BranchId { get; set; }
    public TaxType TaxType { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal TaxPercentage { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal TaxableAmount { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal TaxAmount { get; set; }
    [MaxLength(50)]
    public string TaxDescription { get; set; } = string.Empty;
    // Navigation Properties
    [ForeignKey("TransactionId")]
    public virtual Transaction Transaction { get; set; } = null!;
    [ForeignKey("BranchId")]
    public virtual Location Branch { get; set; } = null!;
    ////[ForeignKey("TaxId")]
    //public Tax Tax { get; set; }
}
