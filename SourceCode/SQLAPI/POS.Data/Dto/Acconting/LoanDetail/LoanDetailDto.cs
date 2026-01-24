using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using System;

namespace POS.Data.Dto.Acconting;
public class LoanDetailDto
{
    public Guid Id { get; set; }
    public Guid LoanAccountId { get; set; }
    public string AccountName { get; set; } 
    public Guid LoanAccountInterestExpenseId { get; set; }
    public string LoanAccountInterestExpenseName { get; set; }
    public decimal LoanAmount { get; set; }
    public string LenderName { get; set; }
    public DateTime LoanDate { get; set; }
    public string Narration { get; set; }
    public Guid BranchId { get; set; }
    public string BranchName { get; set; }
    public string LoanNumber { get; set; }
    public decimal TotalPaidPricipalAmount { get; set; }
    public decimal TotalPaidInterestAmount { get; set;  }
}