using MediatR;
using Microsoft.AspNetCore.Mvc;
using POS.MediatR.WrLicense.Command;
using System.Threading.Tasks;

namespace POS.API.Controllers.WrLicense
{
    [Route("api/[controller]")]
    [ApiController]
    public class WrLicenseController : BaseController
    {
        private readonly IMediator _mediator;

        public WrLicenseController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpPost("validate")]
        public async Task<IActionResult> ValidateLicense([FromBody] ValidateLicenseCommand command)
        {
            var result = await _mediator.Send(command);
            return ReturnFormattedResponse(result);
        }
    }
}
