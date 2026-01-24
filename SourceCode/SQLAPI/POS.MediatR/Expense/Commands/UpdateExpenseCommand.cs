using POS.Helper;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using POS.Data.Dto;

namespace POS.MediatR.CommandAndQuery
{
    public class UpdateExpenseCommand : IRequest<ServiceResponse<bool>>
    {
        public Guid Id { get; set; }
        public string Reference { get; set; }
        public Guid ExpenseCategoryId { get; set; }
        public decimal Amount { get; set; }
        public Guid? ExpenseById { get; set; }
        public string Description { get; set; }
        public DateTime ExpenseDate { get; set; }
        public string ReceiptName { get; set; }
        public bool IsReceiptChange { get; set; }
        public string DocumentData { get; set; }
        public List<Guid> ExpenseTaxIds { get; set; }
        public List<ExpenseTaxDto> ExpenseTaxes { get; set; }
        public Guid LocationId { get; set; }
        public decimal TotalTax { get; set; }
    }
}
