using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using POS.API.Helpers;
using POS.MediatR.Accouting.GeneralEntry;
using System.Threading.Tasks;

namespace POS.API.Controllers.Accounting
{
    /// <summary>
    /// Controller for GeneralEntry
    /// </summary>
    /// <param name="_mediator"></param>
    [Route("api/[controller]")]
    [ApiController]
    public class GeneralEntryController(
        IMediator _mediator) : BaseController
    {
        /// <summary>
        /// Create a General Entry
        /// </summary>
        /// <param name="command"></param>
        /// <returns></returns>
        [HttpPost]
        [ClaimCheck("ACCOUNTING_ADD_GENERAL_ENTRY")]
        public async Task<IActionResult> CreateGeneralEntry(AddGeneralEntryCommand command)
        {
            var result = await _mediator.Send(command);
            return GenerateResponse(result);
        }
    }
}
