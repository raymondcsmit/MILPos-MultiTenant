using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using POS.MediatR.Accouting;
using System;
using System.Threading.Tasks;

namespace POS.API.Controllers.Accounting
{
    /// <summary>
    /// get Daily report
    /// </summary>
    /// <param name="mediator"></param>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DailyReportController(IMediator mediator) : BaseController
    {
        /// <summary>
        /// Get Daily Sale Report
        /// </summary>
        /// <returns></returns>
        [HttpGet("sale")]
        public async Task <IActionResult> GetDailySalesReport([FromQuery]  GetDailySaleReportCommand command)
        {
            var result=await mediator.Send(command);
            return GenerateResponse(result);
        }

        /// <summary>
        /// Get Daily purchase Report
        /// </summary>
        /// <returns></returns>
        [HttpGet("purchase")]
        public async Task<IActionResult> GetDailyPurchaseReport([FromQuery] GetDailyPurchaseReportCommand command)
        {
            var result = await mediator.Send(command);
            return GenerateResponse(result);
        }

        /// <summary>
        /// get daily collected Payment
        /// </summary>
        /// <returns></returns>
        [HttpGet("payment")]
        public async Task<IActionResult> GetPaymentReport([FromQuery] GetDailyPaymentBreakdownReportCommand command)
        {
            var result = await mediator.Send(command);
            return GenerateResponse(result);
        }
    }
}
