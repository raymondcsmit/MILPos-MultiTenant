using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using POS.API.Helpers;
using POS.MediatR.Accouting.YearEndClosing;
using POS.MediatR.Accouting.YearEndClosing.Get;
using System;
using System.Threading.Tasks;

namespace POS.API.Controllers.Accounting
{
    /// <summary>
    /// Controller for Close Year
    /// </summary>
    /// <param name="_mediator"></param>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class YearEndClosingController(IMediator _mediator) : BaseController
    {
        /// <summary>
        /// Close the year
        /// </summary>
        /// <returns></returns>
        [HttpPost]
        [ClaimCheck("ACCOUNTING_VIEW_BOOK_CLOSE")]
        public async Task<IActionResult> CloseYear()
        {
            var reult = await _mediator.Send(new AddYearEndClosingCommand());
            return GenerateResponse(reult);
        }
    }
}
