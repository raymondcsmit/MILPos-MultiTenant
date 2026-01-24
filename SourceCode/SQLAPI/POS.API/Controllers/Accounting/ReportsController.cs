using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using POS.API.Helpers;
using POS.Data.Resources;
using POS.MediatR.Accouting;
using POS.MediatR.Accouting.Report;
using POS.MediatR.Accouting.Report.CashFlow;
using System.Threading.Tasks;

namespace POS.API.Controllers.Accounting
{
    /// <summary>
    /// Controller For Financial Year report
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    //[Authorize]
    public class ReportsController(IMediator _mediator) : BaseController
    {
        /// <summary>
        /// Get Profit Or Loss Report By FinancialYear Id or Branch id
        /// </summary>
        /// <param name="command"></param>
        /// <returns></returns>
        [HttpGet("ProfitLoss")]
        [ClaimCheck("ACCOUNTING_VIEW_PROFIT_LOSS_REPORT")]
        public async Task<IActionResult> GetProfitLossReport([FromQuery] GetProfitLossReportCommand command)
        {
            var result = await _mediator.Send(command);
            return GenerateResponse(result);
        }
        /// <summary>
        /// Get Tax report By FinancialYear Id or Branch id
        /// </summary>
        /// <param name="command"></param>
        /// <returns></returns>
        [HttpGet("taxreport")]
        [ClaimCheck("ACCOUNTING_VIEW_TAX_REPORT")]
        public async Task<IActionResult> GetTaxReport([FromQuery] GetTaxReportCommand command)
        {
            var result = await _mediator.Send(command);
            return GenerateResponse(result);
        }

        /// <summary>
        /// Get cash or bank report By FinancialYear Id or Branch id
        /// </summary>
        /// <param name="command"></param>
        /// <returns></returns>
        [HttpGet("cashbankreport")]
        [ClaimCheck("ACCOUNTING_VIEW_CASH_BANK_REPORT")]
        public async Task<IActionResult> GetCashBabkReport([FromQuery] GetCashBankReportCommand command)
        {
            var result = await _mediator.Send(command);
            return GenerateResponse(result);
        }


        /// <summary>
        /// Get BalanceSheet report By FinancialYear Id or Branch id
        /// </summary>
        /// <param name="command"></param>
        /// <returns></returns>
        [HttpGet("balancesheetreport")]
        [ClaimCheck("ACCOUNTING_VIEW_BALANCE_SHEET_REPORT")]
        public async Task<IActionResult> GetBalanceSheetReport([FromQuery] GetBalanceSheetReportCommand command)
        {
            var result = await _mediator.Send(command);
            return GenerateResponse(result);
        }

        /// <summary>
        /// Get BalanceSheet report By FinancialYear Id or Branch id
        /// </summary>
        /// <param name="command"></param>
        /// <returns></returns>
        [HttpGet("AccountBalancereport")]
        [ClaimCheck("ACCOUNTING_VIEW_ACCOUNT_BALANCE_REPORT")]
        public async Task<IActionResult> GetAccountBalanceReport([FromQuery] GetLedgerAccountBalancesCommand command)
        {
            var result = await _mediator.Send(command);
            return GenerateResponse(result);
        }

        /// <summary>
        /// get all Genral Entry 
        /// </summary>
        /// <param name="generalEntryResource"></param>
        /// <returns></returns>
        [HttpGet]
        [ClaimCheck("ACCOUNTING_VIEW_GENERAL_ENTRY_REPORT")]
        public async Task<IActionResult> GetAllGeneralEntryReport([FromQuery] GeneralEntryResource generalEntryResource)
        {
            var GetGeneralEntryList = new GetGeneralEntryCommand()
            {
                generalEntryResource = generalEntryResource
            };
            var result = await _mediator.Send(GetGeneralEntryList);
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

        /// <summary>
        /// Get Trial balance Report
        /// </summary>
        /// <param name="command"></param>
        /// <returns></returns>
        [HttpGet("trialbalancereport")]
        [ClaimCheck("ACCOUNTING_VIEW_TRIAL_BALANCE_REPORT")]
        public async Task<IActionResult> GetTrialBalanceReport([FromQuery] GetTrialBalanceCommand command)
        {
            var result = await _mediator.Send(command);
            return GenerateResponse(result);
        }

        /// <summary>
        /// Get Cash Flow Report
        /// </summary>
        /// <param name="command"></param>
        /// <returns></returns>
        [HttpGet("cashflowreport")]
        [ClaimCheck("ACCOUNTING_VIEW_CASH_FLOW_REPORT")]
        public async Task<IActionResult> GetCashFlowReport([FromQuery] GetCashFlowReportCommand command)
        {
            var result = await _mediator.Send(command);
            return GenerateResponse(result);
        }

        /// <summary>
        /// get all payment Entry 
        /// </summary>
        /// <param name="paymentEntryResource"></param>
        /// <returns></returns>
        [HttpGet("Paymentreport")]
        public async Task<IActionResult> GetAllPaymentEntryReport([FromQuery] PaymentEntryResource paymentEntryResource)
        {
            var GetGeneralEntryList = new GetPaymentEntryListCommand()
            {
                paymentEntryResource = paymentEntryResource
            };
            var result = await _mediator.Send(GetGeneralEntryList);
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
