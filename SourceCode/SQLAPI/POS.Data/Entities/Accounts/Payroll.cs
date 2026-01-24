using POS.Data.Entities.Accounts;
using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data.Entities;
public class Payroll
{
    public Guid Id { get; set; }
    public Guid EmployeeId { get; set; }
    [ForeignKey("EmployeeId")]
    public User Employee { get; set; }
    public Guid BranchId { get; set; }
    [ForeignKey("BranchId")]
    public Location Location { get; set; }
    public int SalaryMonth { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal MobileBill { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal FoodBill { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal Bonus { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal Commission { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal FestivalBonus { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal TravelAllowance { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal Others { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal BasicSalary { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal Advance { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalSalary { get; set; }
    public PaymentMode PaymentMode { get; set; }
    public string ChequeNo { get; set; }
    public DateOnly SalaryDate { get; set; }
    public string Note { get; set; }
    public string Attachment { get; set; }
    public Guid FinancialYearId { get; set; }
    [ForeignKey("FinancialYearId")]
    public FinancialYear FinancialYear { get; set; }
}
