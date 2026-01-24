using FluentValidation;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR
{
    public class UpdateVariantCommandValidator : AbstractValidator<UpdateVariantCommand>
    {
        public UpdateVariantCommandValidator()
        {
           
            RuleFor(c => c.Id).Must(NotEmptyGuid).WithMessage("Id is required");
            RuleFor(c => c.Name).NotEmpty().WithMessage("Please enter name.");
            RuleFor(c => c.VariantItems).NotEmpty().WithMessage("Alteast add one or more Variant item.");

        }
        private bool NotEmptyGuid(Guid p)
        {
            return p != Guid.Empty;
        }

    }
}
