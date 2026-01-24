using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using POS.API.Helpers;
using POS.Data.Dto;
using POS.Data.Resources;
using POS.MediatR;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace POS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CustomerLedgerController(IMediator _mediator) : BaseController
    {

        /// <summary>
        /// Create an Cutomer Ledger
        /// </summary>
        /// <param name="command"></param>
        /// <returns></returns>
        [HttpPost]
        [ClaimCheck("CUST_MANAGE_CUSTOMER_LADGER")]
        public async Task<IActionResult> AddCustomerLedger(AddCustomerLedgerCommand  command)
        {
            var result = await _mediator.Send(command);
            return ReturnFormattedResponse(result);
        }

        /// <summary>
        /// Get customer Ledger.
        /// </summary>
        /// <returns></returns>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetCustomerLedger(Guid id)
        {
            var query = new GetCustomerLedgerCommand() { Id = id };
            var result = await _mediator.Send(query);
            return ReturnFormattedResponse(result);
        }


        /// <summary>
        /// Searches the suppliers.
        /// </summary>
        /// <param name="searchQuery">The search query.</param>
        /// <param name="pageSize">Size of the page.</param>
        /// <returns></returns>
        [HttpGet("customerLedger")]
        public async Task<IActionResult> LedgerSearch(string searchQuery, int pageSize)
        {
            var query = new SearchCustomerLedgerCommand
            {
                SearchQuery = searchQuery
            };
            var result = await _mediator.Send(query);
            return GenerateResponse(result);
        }

        /// <summary>
        /// Get Customer ledger Configuration list.
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        [ClaimCheck("CUST_VIEW_CUSTOMER_LADGERS")]
        public async Task<IActionResult> GetCustomerledger([FromQuery] CustomerLedgerResource customerLedgerResource)
        {
            var query = new GetAllCustomerLedgerCommand()
            {
                  CustomerLedgerResource   = customerLedgerResource
            };
            var result = await _mediator.Send(query);
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
        /// Delete Customer ledger
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAccountLedger(Guid id)
        {
            var result = await _mediator.Send(new DeleteCustomerLedgerCommand()
            {
                Id = id
            });
            return GenerateResponse(result);
        }

        // <summary>
        /// get sales order overdue by customer id
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpGet("{id}/overdue")]
        public async Task<IActionResult> GetSalesOrderOverdueByCustomerId(Guid id)
        {
            var getSaleOrdeOverdueCommand = new GetSalesOrderOverdueByCustomerIdCommand
            {
                CustomerId = id
            };

            var response = await _mediator.Send(getSaleOrdeOverdueCommand);
            return GenerateResponse(response);
        }

    }
}
