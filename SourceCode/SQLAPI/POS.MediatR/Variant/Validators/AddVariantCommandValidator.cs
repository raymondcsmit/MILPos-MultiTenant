using FluentValidation;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR
{
    public class AddVariantCommandValidator : AbstractValidator<AddVariantCommand>
    {
        public AddVariantCommandValidator()
        {
            RuleFor(c => c.Name).NotEmpty().WithMessage("Please enter name.");

            RuleFor(c => c.VariantItems).NotEmpty().WithMessage("Alteast add one or more Variant item.");
           
        }

    }
}
