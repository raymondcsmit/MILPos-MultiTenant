using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Data.Dto.Acconting
{
    public class DailySaleReportDto
    {
        public int TransactionCount {  get; set; }
        public decimal GrossSales { get; set; }
        public decimal Discounts { get; set; }
        public decimal TaxableAmount { get; set; }
        public decimal TotalTax { get; set; }
        public decimal NetSales {  get; set; }
        public int ItemsSoldCount { get; set; }
        public int ItemsReturn {  get; set; }
        public decimal AverageSale {  get; set; }
    }
}
