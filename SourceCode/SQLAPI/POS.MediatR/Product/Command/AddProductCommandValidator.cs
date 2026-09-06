using FluentValidation;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR.Product.Command
{
    public class AddProductCommandValidator:AbstractValidator<AddProductCommand>
    {
        public AddProductCommandValidator()
        {
            RuleFor(c => c.Name)
                .NotEmpty()
                .WithMessage("name is required");
            RuleFor(c => c.CategoryId)
                .NotEmpty()
                .WithMessage("category is required");
            RuleFor(c => c.UnitId)
                .NotEmpty()
                .WithMessage("unit is required");
            RuleFor(c => c.BrandId)
                .NotEmpty()
                .WithMessage("brand is required");
            RuleFor(c => c.PurchasePrice)
                .NotEmpty()
                .WithMessage("purchase price is required");
        }
    }
}
