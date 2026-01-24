using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Data.Dto.Acconting.Report
{
    public class TrialBalanceDto
    {
        public Decimal CreditTotalAmount { get; set; }
        public Decimal DebitTotalAmount { get; set; }
        public List<TrialBalanceAccountDto> TrialBalanceAccounts { get; set; }
    }

    public class TrialBalanceAccountDto
    {
        public string AccountName {  get; set; }
        public Decimal DebitAmount {  get; set; }
        public Decimal CreditAmount {  get; set; }
    }
}
