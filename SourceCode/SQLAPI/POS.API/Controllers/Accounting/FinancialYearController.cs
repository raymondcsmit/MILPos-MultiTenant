using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using POS.API.Helpers;
using POS.MediatR.Accouting;
using System;
using System.Threading.Tasks;

namespace POS.API.Controllers.Accounting
{
    /// <summary>
    /// Controller For Financial Year
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class FinancialYearController(
        IMediator _mediator) : BaseController
    {
        /// <summary>
        /// Financial Year Drop Down
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        [ClaimCheck("ACCOUNTING_VIEW_FINANCIAL_YEARS")]
        public async Task<IActionResult> GetFinancialYears()
        {
            var result = await _mediator.Send(new GetAllFinancialYearCommand());
            return GenerateResponse(result);
        }

        /// <summary>
        /// Create Financial Year
        /// </summary>
        /// <param name="command"></param>
        /// <returns></returns>
        [HttpPost]
        [ClaimCheck("ACCOUNTING_MANAGE_FINANCIAL_YEAR")]
        public async Task<IActionResult> CreateFinancialYear(AddFinancialYearCommand command)
        {
            var result = await _mediator.Send(command);
            return GenerateResponse(result);
        }

        /// <summary>
        /// Update financial year by id
        /// </summary>
        /// <param name="id"></param>
        /// <param name="command"></param>
        /// <returns></returns>
        [HttpPut("{id}")]
        [ClaimCheck("ACCOUNTING_MANAGE_FINANCIAL_YEAR")]
        public async Task<IActionResult> UpdateFinancialYear(Guid id, UpdateFinancialYearCommand command)
        {
            command.Id = id;
            var result = await _mediator.Send(command);
            return GenerateResponse(result);
        }

        /// <summary>
        /// Get financial year by id
        /// </summary>
        /// <param name="id"></param>
        /// <param name="command"></param>
        /// <returns></returns>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetFinancialYear(Guid id)
        {
            var getFinancialYearCommand = new GetFinancialYearCommand { Id = id };
            var result = await _mediator.Send(getFinancialYearCommand);
            return GenerateResponse(result);
        }

        /// <summary>
        /// Delete financial year.
        /// </summary>
        /// <param name="Id"></param>
        /// <returns></returns>
        [HttpDelete("{Id}")]
        public async Task<IActionResult> DeleteFinancialYear(Guid Id)
        {
            var deleteFinancialYearCommand = new DeleteFinancialYearCommand { Id = Id };
            var result = await _mediator.Send(deleteFinancialYearCommand);
            return ReturnFormattedResponse(result);
        }
    }
}
