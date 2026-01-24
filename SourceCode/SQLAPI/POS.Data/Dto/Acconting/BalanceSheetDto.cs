using POS.Data.Entities.Accounts;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Data.Dto.Acconting
{
    public class BalanceSheetDto
    {
        public decimal TotalAssets { get; set; }
        public decimal TotalLiabilities { get; set; }
        public decimal TotalEquity { get; set; }
        public List<AccountBalanceDto> Assets { get; set; }
        public List<AccountBalanceDto> Liabilities { get; set; } 
        public List<AccountBalanceDto> Equity { get; set; } 

    }

    public class AccountBalanceDto
    {
        public string AccountCode { get; set; }
        public string AccountName { get; set; }
        public AccountGroup Group { get; set; }
        public decimal Balance { get; set; }
    }
}
