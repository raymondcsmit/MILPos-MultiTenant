using POS.Data.Entities.Accounts;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Data.Dto
{
    public class TaxAndLedgerAccountDto
    {
        public decimal TaxPercantage {  get; set; }
        public LedgerAccount LedgerAccount {  get; set; }
    }
}
