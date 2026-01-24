using POS.Data.Dto;
using POS.Helper;
using MediatR;
using System;
using System.Collections.Generic;

namespace POS.MediatR.CommandAndQuery
{
    public class AddExpenseCommand : IRequest<ServiceResponse<ExpenseDto>>
    {
        public Guid? Id { get; set; }
        public string Reference { get; set; }
        public Guid ExpenseCategoryId { get; set; }
        public decimal Amount { get; set; }
        public Guid? ExpenseById { get; set; }
        public string Description { get; set; }
        public DateTime ExpenseDate { get; set; }
        public string ReceiptName { get; set; }
        public string DocumentData { get; set; }
        public List<Guid> ExpenseTaxIds { get; set; }
        public List<ExpenseTaxDto> ExpenseTaxes { get; set; }
        public bool IsReceiptChange { get; set; }
        public Guid LocationId { get; set; }
        public decimal TotalTax { get; set; }
    }
}
