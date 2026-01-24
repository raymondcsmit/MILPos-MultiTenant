using System;
using POS.Data.Entities.Accounts;

namespace POS.Data.Dto.Acconting.Report
{
    public class GeneralEntryDto
    {
        public string TransactionNumber { get; set; }
        public string AccountCode { get; set; }
        public string AccountName { get; set; }
        public decimal DebitAmount { get; set; }
        public decimal CreditAmount { get; set; }
        public AccountType AccountType { get; set; }
        public DateTime CreatedDate { get; set; }
        public TransactionType TransactionType { get; set; }    
    }
}
