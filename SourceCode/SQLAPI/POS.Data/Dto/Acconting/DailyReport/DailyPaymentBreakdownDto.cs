using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Data.Dto.Acconting
{
    public class DailyPaymentBreakdownDto
    {
        public decimal CashReceived {  get; set; }
        public decimal BankReceived {  get; set; }
        public decimal TotalCollected {  get; set; }

        public decimal CashGiven { get; set; }
        public decimal BankGiven { get; set; }
        public decimal TotalGiven {  get; set; }

        // Net total
        public decimal NetCash => CashReceived - CashGiven;
        public decimal NetBank => BankReceived - BankGiven;
        public decimal NetTotal => TotalCollected - TotalGiven;
    }
}




