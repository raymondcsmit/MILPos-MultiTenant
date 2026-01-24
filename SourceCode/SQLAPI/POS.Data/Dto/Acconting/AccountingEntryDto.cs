using POS.Data.Entities.Accounts;

namespace POS.Data.Dto;
public class AccountingEntryDto
{
    public string DebitAccount { get; set; } = string.Empty;
    public string CreditAccount { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Narration { get; set; } = string.Empty;
    public EntryType EntryType { get; set; }
}