using FluentValidation;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting.GeneralEntry
{
    public class AddGeneralEntryCommandValidator:AbstractValidator<AddGeneralEntryCommand>
    {
        public AddGeneralEntryCommandValidator()
        {
            RuleFor(c => c).Must(c => c.DebitLedgerAccountId != c.CreditLedgerAccountId).WithMessage("Debit and Credit Ledger Account cannot be the same");
            RuleFor(c => c.DebitLedgerAccountId).NotEmpty().WithMessage("DebitLedgerAccount Id is required");
            RuleFor(c => c.CreditLedgerAccountId).NotEmpty().WithMessage("DebitLedgerAccount Id is required");
            RuleFor(c => c.Amount).GreaterThan(0).WithMessage("Amount must GreaterThan 0");
            RuleFor(c => c.Narration).NotEmpty().WithMessage("Narration is required");
        }
    }
}
