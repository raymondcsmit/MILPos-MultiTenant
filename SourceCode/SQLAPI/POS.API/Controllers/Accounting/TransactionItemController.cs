using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using POS.MediatR.Accouting;
using System;
using System.Threading.Tasks;

namespace POS.API.Controllers
{
    /// <summary>
    /// Controller for Transactions Item
    /// </summary>
    /// <param name="_mediator"></param>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TransactionItemController(IMediator _mediator) : BaseController
    {
        /// <summary>
        /// Get Transactionitems by Transaction Id
        /// </summary>
        /// <param name="transactionId"></param>
        /// <returns></returns>
        [HttpGet("{transactionId}")]
        public async Task<IActionResult> GetTransactionItems(Guid transactionId)
        {
            var result = await _mediator.Send(new GetTransactionItemsCommand { TransactionId = transactionId });
            return GenerateResponse(result);
        }
    }
}
