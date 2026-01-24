using MediatR;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using POS.MediatR.CommandAndQuery;
using Microsoft.AspNetCore.Authorization;
using POS.API.Helpers;
using POS.MediatR.Email.Commands;

namespace POS.API.Controllers.Email
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class EmailController : BaseController
    {
        IMediator _mediator;
        public EmailController(IMediator mediator)
        {
            _mediator = mediator;
        }
        /// <summary>
        /// Send mail.
        /// </summary>
        /// <param name="sendEmailCommand"></param>
        /// <returns></returns>
        [HttpPost(Name = "SendEmail")]
        [ClaimCheck("EMAIL_SEND_EMAIL")]
        [Produces("application/json", "application/xml", Type = typeof(void))]
        public async Task<IActionResult> SendEmail(SendEmailCommand sendEmailCommand)
        {
            var result = await _mediator.Send(sendEmailCommand);
            return Ok(result);
        }


        /// <summary>
        /// send sales or purchase
        /// </summary>
        /// <param name="addSendEmailSuppliersCommand"></param>
        /// <returns></returns>
        [HttpPost("salesOrPurchase")]
        public async Task<IActionResult> SendSalesOrdPurchase(SendSalesOrPurchaseCommand addSendEmailSuppliersCommand)
        {
            var result = await _mediator.Send(addSendEmailSuppliersCommand);
            return Ok(result);
        }
    }
}
