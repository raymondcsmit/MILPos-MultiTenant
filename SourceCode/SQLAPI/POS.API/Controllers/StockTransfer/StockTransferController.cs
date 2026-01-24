using System;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using POS.API.Helpers;
using POS.Data.Resources;
using POS.MediatR.Commands;

namespace POS.API.Controllers.StockTransfer
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class StockTransferController(
        IMediator mediator) : BaseController
    {

        /// <summary>
        /// get stock transfter
        /// </summary>
        /// <param name="stockTranferResource"></param>
        /// <returns></returns>
        [HttpGet]
        [ClaimCheck("STTFR_VIEW_STTFR")]
        public async Task<IActionResult> GetStockTransfer([FromQuery] StockTranferResource stockTranferResource)
        {
            var command = new GetAllStockTransferCommand
            {
                StockTranferResource = stockTranferResource
            };

            var result = await mediator.Send(command);

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
        /// create stock transfer command
        /// </summary>
        /// <param name="addStockTransferCommand"></param>
        /// <returns></returns>
        [HttpPost]
        [ClaimCheck("STTFR_MANAGE_STTFR")]
        public async Task<IActionResult> CreateStockTransfer(AddStockTransferCommand addStockTransferCommand)
        {
            var result = await mediator.Send(addStockTransferCommand);
            return ReturnFormattedResponse(result);
        }

        /// <summary>
        /// get stock transfer by id
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpGet("{id}")]
        [ClaimCheck("STTFR_VIEW_STTFR", "STTFR_MANAGE_STTFR", "REP_STOCK_REPORT", "INVE_VIEW_INVENTORIES")]
        public async Task<IActionResult> GetStockTransferById(Guid id)
        {
            var command = new GetStockTransferCommand
            {
                Id = id
            };
            var result = await mediator.Send(command);
            return ReturnFormattedResponse(result);
        }

        /// <summary>
        /// update stock transfer
        /// </summary>
        /// <param name="id"></param>
        /// <param name="updateStockTransferCommand"></param>
        /// <returns></returns>
        [HttpPut("{id}")]
        [ClaimCheck("STTFR_MANAGE_STTFR")]
        public async Task<IActionResult> UpdateStockTransfer(Guid id,
            UpdateStockTransferCommand updateStockTransferCommand)
        {
            updateStockTransferCommand.Id = id;
            var result = await mediator.Send(updateStockTransferCommand);
            return ReturnFormattedResponse(result);
        }

        /// <summary>
        /// delete stock transfer
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpDelete("{id}")]
        [ClaimCheck("STTFR_MANAGE_STTFR")]
        public async Task<IActionResult> DeleteStockTransfer(Guid id)
        {
            var command = new DeleteStockTransferCommand
            {
                Id = id
            };
            var result = await mediator.Send(command);
            return ReturnFormattedResponse(result);
        }

    }
}
