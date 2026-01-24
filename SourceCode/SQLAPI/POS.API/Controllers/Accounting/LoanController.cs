using System;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using POS.API.Helpers;
using POS.MediatR.Accouting;

namespace POS.API.Controllers.Accounting;
[Route("api/[controller]")]
[ApiController]
[Authorize]
public class LoanController(IMediator _mediator) : BaseController
{
    /// <summary>
    /// Add New Loan
    /// </summary>
    /// <param name="addLoanDetailCommand"></param>
    /// <returns></returns>
    [HttpPost]
    [ClaimCheck("LOAN_MANAGE_LOAN")]
    public async Task<IActionResult> AddLoan(AddLoanDetailCommand addLoanDetailCommand)
    {
        var result = await _mediator.Send(addLoanDetailCommand);
        return Ok(result.Data);
    }

    /// <summary>
    /// Loan Repayment
    /// </summary>
    /// <param name="addPartialRePaymentOfLoanCommand"></param>
    /// <returns></returns>

    [HttpPost("repayment")]
    public async Task<IActionResult> AddLoanRepayment(AddPartialRePaymentOfLoanCommand addPartialRePaymentOfLoanCommand)
    {
        var result = await _mediator.Send(addPartialRePaymentOfLoanCommand);
        return Ok(result.Data);
    }

    /// <summary>
    /// get all Loan details
    /// </summary>
    /// <returns></returns>
    [HttpGet]
    [ClaimCheck("LOAN_VIEW_LOANS")]
    public async Task<IActionResult> GetAllLoanDetails()
    {
        var result = await _mediator.Send(new GetAllLoanDetailsCommand());
        return Ok(result.Data);
    }

    /// <summary>
    /// get all Loan Loan Re PaymentDetails  by loan id
    /// </summary>
    /// <returns></returns>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetLoanRePaymentDetails(Guid id)
    {
        var result = await _mediator.Send(new GetPartialRePaymentOfLoanCommand() { Id = id });
        return Ok(result.Data);
    }
}
