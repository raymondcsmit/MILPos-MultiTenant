using System;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using POS.MediatR.Tenant.Commands;
using POS.Data.Dto; // Assuming CreateTenantDto is here, or similar

namespace POS.API.Controllers
{
    public class PricingController : Controller
    {
        private readonly IMediator _mediator;

        public PricingController(IMediator mediator)
        {
            _mediator = mediator;
        }

        public IActionResult Index()
        {
            return View();
        }

        public IActionResult Payment(string plan)
        {
            ViewBag.Plan = plan;
            return View();
        }

        public IActionResult Register()
        {
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Subscribe(CreateTenantCommand command)
        {
            if (!ModelState.IsValid)
            {
                return View("Register", command);
            }

            // Execute the CreateTenantCommand using MediatR
            var result = await _mediator.Send(command);

            if (result.Success)
            {
                // Redirect to success page or login
                // Ideally, send email with credentials here if not handled by Command
                // Sending to a "Success" view with details
                ViewBag.TenantName = result.Data.Name;
                ViewBag.AdminEmail = command.AdminEmail;
                return View("Success");
            }

            foreach (var error in result.Errors)
            {
                ModelState.AddModelError(string.Empty, error);
            }

            return View("Register", command);
        }
        
        public IActionResult Success()
        {
             return View();
        }
    }
}
