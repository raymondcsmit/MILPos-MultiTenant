using System.Collections.Generic;

namespace POS.Data.Dto.Acconting.Report
{
    public class CashFlowDto
    {
        public decimal TotalCashRecived { get; set; }
        public decimal TotalCashPaid { get; set; }
        public decimal NetTotalMovement { get; set; }
        public List<CashFlowAccountDto> cashFlowAccounts { get; set; }
    }

    public class CashFlowAccountDto
    {
        public string AccountName { get; set; }
        public decimal DebitAmount { get; set; }
        public decimal CreditAmount { get; set; }

    }

}
