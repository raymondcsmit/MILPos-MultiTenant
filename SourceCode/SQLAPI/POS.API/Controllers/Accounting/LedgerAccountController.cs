using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using POS.API.Helpers;
using POS.MediatR;
using POS.MediatR.Accouting;
using System;
using System.Threading.Tasks;

namespace POS.API.Controllers.Accounting;
/// <summary>
/// Controller for LedgerAccount
/// </summary>
/// <param name="_mediator"></param>
[Route("api/[controller]")]
[ApiController]
[Authorize]
public class LedgerAccountController(IMediator _mediator) : BaseController
{
    /// <summary>
    /// get all branch wise LedgerAccounts
    /// </summary>
    /// <param name="branchId"></param>
    /// <returns></returns>
    [HttpGet("{branchId}/groupby/accountType")]
    [ClaimCheck("ACCOUNTING_VIEW_LEDGER_ACCOUNTS")]
    public async Task<IActionResult> GetLedgerAccountsGroupByAccountType(Guid branchId)
    {
        var result = await _mediator.Send(new GetAllLedgerAccountGroupByAccountTypeCommand() { BranchId = branchId });
        return GenerateResponse(result);
    }

    [HttpGet("{branchId}")]
    [ClaimCheck("ACCOUNTING_VIEW_LEDGER_ACCOUNTS")]
    public async Task<IActionResult> GetLedgerAccounts(Guid branchId)
    {
        var result = await _mediator.Send(new GetAllLedgerAccountCommand() { BranchId = branchId });
        return GenerateResponse(result);
    }

    /// <summary>
    /// Add Account opning Balance by Account Id
    /// </summary>
    /// <param name="command"></param>
    /// <returns></returns>
    [HttpPost("opening-balance")]
    [ClaimCheck("MANAGE_OPENING_BALANCE")]
    public async Task<IActionResult> AddOpningBalance(AddOpeningBalanceCommand command)
    {
        var result = await _mediator.Send(command);
        return GenerateResponse(result);
    }

    /// <summary>
    /// Add Account 
    /// </summary>
    /// <param name="command"></param>
    /// <returns></returns>
    [HttpPost]
    [ClaimCheck("ACCOUNTING_ADD_LEDGER_ACCOUNT")]
    public async Task<IActionResult> AddLedgerAccount(AddLedgerAccountCommand command)
    {
        var result = await _mediator.Send(command);
        return GenerateResponse(result);
    }

    /// <summary>
    /// Add Account opning Balance by Account Id
    /// </summary>
    /// <param name="id"></param>
    /// <param name="command"></param>
    /// <returns></returns>
    [HttpGet("dropdown")]
    public async Task<IActionResult> GetLedgerAccountDropDown()
    {
        var result = await _mediator.Send(new GetLedgerAccountDropDownCommand());
        return GenerateResponse(result);
    }

    /// <summary>
    /// Update Ledger Account
    /// </summary>
    /// <param name="id"></param>
    /// <param name="command"></param>
    /// <returns></returns>
    [HttpPut("{id}")]
    [ClaimCheck("ACCOUNTING_UPDATE_LEDGER_ACCOUNT")]
    public async Task<IActionResult> UpdateLedgerAccount(Guid id, UpdateLedgerAccountCommand command)
    {
        command.Id = id;
        var result = await _mediator.Send(command);
        return GenerateResponse(result);
    }
}
