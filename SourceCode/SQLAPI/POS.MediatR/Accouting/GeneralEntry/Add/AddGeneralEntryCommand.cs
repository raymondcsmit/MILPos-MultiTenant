using MediatR;
using POS.Data.Entities.Accounts;
using POS.Helper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting.GeneralEntry
{
    public class AddGeneralEntryCommand : IRequest<ServiceResponse<bool>>
    {
        public Guid BranchId { get; set; }
        public DateTime TransitionDate { get; set; }
        public string Narration { get; set; }
        public Guid DebitLedgerAccountId { get; set; }
        public Guid CreditLedgerAccountId { get; set; }
        public decimal Amount { get; set; }
        public string ReferenceNumber { get; set; }
    }
}
