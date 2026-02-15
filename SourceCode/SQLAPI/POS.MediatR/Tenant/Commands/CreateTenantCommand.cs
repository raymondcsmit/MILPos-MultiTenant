using MediatR;
using POS.Helper;
using System.ComponentModel.DataAnnotations;

namespace POS.MediatR.Tenant.Commands
{
    public class CreateTenantCommand : IRequest<ServiceResponse<POS.Data.Entities.Tenant>>
    {
        [Required(ErrorMessage = "Business Name is required")]
        public string Name { get; set; }

        [Required(ErrorMessage = "Subdomain is required")]
        public string Subdomain { get; set; }

        public string ContactEmail { get; set; }

        [Required(ErrorMessage = "Phone Number is required")]
        public string ContactPhone { get; set; }

        [Required(ErrorMessage = "Address is required")]
        public string Address { get; set; }

        [Required(ErrorMessage = "Admin Email is required")]
        [EmailAddress(ErrorMessage = "Invalid Email Address")]
        public string AdminEmail { get; set; }

        [Required(ErrorMessage = "Contact Name is required")]
        public string ContactName { get; set; }

        [Required(ErrorMessage = "Password is required")]
        public string AdminPassword { get; set; }

        [Required(ErrorMessage = "Confirm Password is required")]
        [Compare("AdminPassword", ErrorMessage = "Passwords do not match")]
        public string ConfirmPassword { get; set; }

        public string BusinessType { get; set; } = "Retail"; // Default to Retail

        [AllowedValues(true, ErrorMessage = "You must accept the Terms of Service")]
        public bool TermsAccepted { get; set; }
    }
}
