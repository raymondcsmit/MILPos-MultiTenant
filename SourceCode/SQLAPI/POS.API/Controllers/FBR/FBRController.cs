using MediatR;
using Microsoft.AspNetCore.Mvc;
using POS.Helper;
using POS.MediatR.FBR.Commands;
using POS.MediatR.FBR.Queries;
using System;
using System.Threading.Tasks;

namespace POS.API.Controllers.FBR
{
    [ApiController]
    [Route("api/fbr")]
    public class FBRController : ControllerBase
    {
        private readonly IMediator _mediator;
        
        public FBRController(IMediator mediator)
        {
            _mediator = mediator;
        }
        
        /// <summary>
        /// Manually submit invoice to FBR
        /// </summary>
        [HttpPost("submit/{salesOrderId}")]
        public async Task<IActionResult> SubmitInvoice(Guid salesOrderId)
        {
            var command = new SubmitFBRInvoiceCommand { SalesOrderId = salesOrderId };
            var response = await _mediator.Send(command);

            if (response.Success)
            {
                return Ok(response.Data);
            }

            return BadRequest(new { error = string.Join(", ", response.Errors) });
        }
        
        /// <summary>
        /// Get FBR submission status for invoice
        /// </summary>
        [HttpGet("status/{salesOrderId}")]
        public async Task<IActionResult> GetStatus(Guid salesOrderId)
        {
            var query = new GetFBRInvoiceStatusQuery { SalesOrderId = salesOrderId };
            var response = await _mediator.Send(query);

            if (response.Success)
            {
                return Ok(response.Data);
            }

            return NotFound(new { error = string.Join(", ", response.Errors) });
        }
    }
}
