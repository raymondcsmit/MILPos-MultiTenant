using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Data.Dto.Acconting
{
    public class ProfitLossDataDto
    {
        public decimal SalesRevenue { get; set; }
        public decimal SalesReturn { get; set; }
        public decimal COGS { get; set; }
        public decimal COGSReturn { get; set; }
        public Decimal GrossProfit {  get; set; } //Gross Profit = Revenue – COGS
        public Decimal Expense {  get; set; } //Gross Profit = Revenue – COGS
        public Decimal NetResult {  get; set; } //  >0 = Profit, <0 = Loss, 0 = Break-even

        public string ProfitOrLoss {  get; set; } // "Profit" / "Loss" / "Break-even"
    }
}
