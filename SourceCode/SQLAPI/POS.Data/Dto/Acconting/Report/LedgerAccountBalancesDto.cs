using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Data.Dto.Acconting.Report
{
    //public class LedgerAccountBalancesDto
    //{
    //    public List<LeadgerAccountDataDto> LeadgerAccountDatasDto { get; set; }
    //}

    public class LedgerAccountBalancesDto
    {
        public string AccountName {  get; set; }
        public decimal DebitTotals {  get; set; }
        public decimal CreditTotal {  get; set; }
    }

}
