using System;
using POS.Data.Entities.Accounts;

namespace POS.Data.Dto.Acconting;
public class LedgerAccountDto
{
    public Guid Id { get; set; }
    public string AccountCode { get; set; }
    public string AccountName { get; set; }
    public AccountType AccountType { get; set; }
    public AccountGroup AccountGroup { get; set; }
    public Guid? ParentAccountId { get; set; }
    public decimal OpeningBalance { get; set; }
    public bool IsActive { get; set; }
    public bool IsSystem { get; set; }
}
