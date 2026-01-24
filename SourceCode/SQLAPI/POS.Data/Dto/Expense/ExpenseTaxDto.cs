using System;

namespace POS.Data.Dto
{
    public class ExpenseTaxDto
    {
        public Guid? Id { get; set; }
        public Guid TaxId { get; set; }
        public Guid? ExpenseId { get; set; }
        public decimal TaxValue { get; set; }
        public string TaxName { get; set; }
        public decimal? TaxPercentage { get; set; }
        public TaxDto Tax { get; set; }
    }
}
