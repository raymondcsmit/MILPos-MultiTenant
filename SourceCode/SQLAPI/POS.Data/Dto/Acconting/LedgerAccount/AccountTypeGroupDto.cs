using POS.Data.Entities.Accounts;
using System.Collections.Generic;

namespace POS.Data.Dto.Acconting;
public class AccountTypeGroupDto
{
    public AccountType AccountType { get; set; }
    public List<LedgerAccountDto> Items { get; set; }
}