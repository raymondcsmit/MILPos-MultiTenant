
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data.Dto
{
    public class ExpenseDto
    {
        public Guid Id { get; set; }
        public string Reference { get; set; }
        public Guid ExpenseCategoryId { get; set; }
        public string ExpenseCategory { get; set; }
        public decimal Amount { get; set; }
        public Guid? ExpenseById { get; set; }
        public string Description { get; set; }
        public string ExpenseBy { get; set; }
        public DateTime ExpenseDate { get; set; }
        public DateTime CreatedDate { get; set; }
        public string ReceiptName { get; set; }
        public string LocationName { get; set; }
        public List<ExpenseTaxDto> ExpenseTaxes { get; set; }
        public decimal TotalTax { get; set; }
    }
}
