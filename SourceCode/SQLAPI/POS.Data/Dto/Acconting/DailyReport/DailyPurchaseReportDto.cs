using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.Data.Dto.Acconting
{
    public class DailyPurchaseReportDto
    {
        public int TransactionCount { get; set; }
        public decimal GrossPurchase { get; set; }
        public decimal TaxableAmount { get; set; }
        public decimal TotalTax { get; set; }
        public decimal Discounts { get; set; }
        public decimal NetPurchase { get; set; }
        public int PurchasedItemsCount { get; set; }
        public int ItemsReturn { get; set; }
        public decimal AveragePurchase { get; set; }
    }
}
