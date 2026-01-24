using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Data.Dto.Acconting.YearEndClosing
{
    public class YearEndClosingResultDto
    {
        public decimal TotalIncome { get; set; }
        public decimal TotalExpense { get; set; }
        public decimal NetProfitOrLoss { get; set; }
        public Guid BranchId { get; set; }

        public List<AccountOpeningBalanceDto> OpeningBalances { get; set; } = new();
    }

    public class AccountOpeningBalanceDto
    {
        public Guid AccountId { get; set; }
        public string AccountName { get; set; } = string.Empty;
        public decimal Debit { get; set; }
        public decimal Credit { get; set; }
    }

}
