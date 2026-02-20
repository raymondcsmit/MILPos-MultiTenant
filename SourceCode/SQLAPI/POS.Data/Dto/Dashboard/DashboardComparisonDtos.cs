using System;

namespace POS.Data.Dto.Dashboard
{
    public class ProductSalesComparisonDto
    {
        public string ProductName { get; set; }
        public int CurrentYearQuantity { get; set; }
        public int LastYearQuantity { get; set; }
        // Keep revenue optional if needed later
        public decimal CurrentYearRevenue { get; set; }
        public decimal LastYearRevenue { get; set; }
    }

    public class IncomeComparisonDto
    {
        public int Month { get; set; }
        public int Year { get; set; }
        public decimal CurrentYearIncome { get; set; }
        public decimal LastYearIncome { get; set; }
    }

    public class SalesComparisonDto
    {
        public int Month { get; set; }
        public int Year { get; set; }
        public decimal CurrentYearSales { get; set; }
        public decimal LastYearSales { get; set; }
    }
}
