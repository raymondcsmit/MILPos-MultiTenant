using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using POS.API.Helpers;
using POS.Data.Resources;
using POS.MediatR;
using System.Threading.Tasks;

namespace POS.API.Controllers
{
    /// <summary>
    /// Controller for transaction
    /// </summary>
    /// <param name="_mediator"></param>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TransactionController(IMediator _mediator) : BaseController
    {
        /// <summary>
        /// get all Transactions
        /// </summary>
        /// <param name="transactionResource"></param>
        /// <returns></returns>
        [HttpGet]
        [ClaimCheck("ACCOUNTING_VIEW_TRANSACTIONS")]
        public async Task<IActionResult> GetTransactions([FromQuery] TransactionResource transactionResource)
        {
            var getAllTransactionCommand = new GetAllTransactionCommand()
            {
                transactionResource = transactionResource
            };
            var result = await _mediator.Send(getAllTransactionCommand);
            var paginationMetadata = new
            {
                totalCount = result.TotalCount,
                pageSize = result.PageSize,
                skip = result.Skip,
                totalPages = result.TotalPages
            };
            Response.Headers.Append("X-Pagination",
                Newtonsoft.Json.JsonConvert.SerializeObject(paginationMetadata));

            return Ok(result);
        }

    }
}
