using FluentValidation;
using POS.MediatR.CommandAndQuery;

namespace POS.MediatR.Supplier.Validators
{
    public class AddSupplierCommandValidator : AbstractValidator<AddSupplierCommand>
    {
        public AddSupplierCommandValidator()
        {
            RuleFor(c => c.SupplierName)
                .NotEmpty()
                .WithMessage("supplierName is required");
            RuleFor(c => c.BillingAddressId)
                .NotEmpty()
                .When(c => c.BillingAddress == null)
                .WithMessage("billingAddressId or billingAddress is required");
            RuleFor(c => c.BillingAddress)
                .NotNull()
                .When(c => c.BillingAddressId == null || c.BillingAddressId == System.Guid.Empty)
                .WithMessage("billingAddressId or billingAddress is required");
            RuleFor(c => c.ShippingAddressId)
                .NotEmpty()
                .When(c => c.ShippingAddress == null)
                .WithMessage("shippingAddressId or shippingAddress is required");
            RuleFor(c => c.ShippingAddress)
                .NotNull()
                .When(c => c.ShippingAddressId == null || c.ShippingAddressId == System.Guid.Empty)
                .WithMessage("shippingAddressId or shippingAddress is required");
        }
    }
}
