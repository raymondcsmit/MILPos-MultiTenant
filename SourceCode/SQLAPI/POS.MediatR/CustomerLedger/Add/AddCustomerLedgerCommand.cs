using MediatR;
using POS.Data.Dto;
using POS.Helper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR
{
    public class AddCustomerLedgerCommand:IRequest<ServiceResponse<CustomerLedgerDto>>
    {
        public DateTime Date { get; set; }
        public Guid? CustomerId { get; set; }
        public Guid LocationId { get; set; }
        public string LocationName { get; set; }
        public string Description { get; set; }
        public decimal Amount { get; set; }
        public decimal Balance { get; set; }
        public decimal Overdue { get; set; }
        public string Reference { get; set; }
        public bool IsCustomer { get; set; }
        public string? Note { get; set; }
    }
}
