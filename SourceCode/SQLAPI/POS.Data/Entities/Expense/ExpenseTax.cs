using System;
using System.ComponentModel.DataAnnotations.Schema;


namespace POS.Data.Entities
{
    public class ExpenseTax: BaseEntity
    {
        public Guid Id { get; set; }
        public Guid ExpenseId { get; set; }
        [ForeignKey("ExpenseId")]
        public Expense Expense { get; set; }
        public Guid TaxId { get; set; }
        [ForeignKey("TaxId")]
        public Tax Tax { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal TaxValue { get; set; }
    }
}
