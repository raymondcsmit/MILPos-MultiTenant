using FluentValidation;
using POS.MediatR.CommandAndQuery;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR
{
    public class AddExpenseCommandValidator:AbstractValidator<AddExpenseCommand>
    {
        public AddExpenseCommandValidator()
        {
            RuleFor(c => c.Reference).NotEmpty().WithMessage("Reference number is required");
        }
    }
}
