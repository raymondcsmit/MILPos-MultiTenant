using POS.Data.Entities.Accounts;
using System;

namespace POS.Data.Resources;
public class LedgerAccountResource : ResourceParameter
{
    public LedgerAccountResource() : base("")
    {

    }

    public Guid BranchId { get; set; }
    public string AccountCode { get; set; }
    public string AccountName { get; set; }
    public AccountType? AccountType { get; set; }
    public AccountGroup? AccountGroup { get; set; }
}