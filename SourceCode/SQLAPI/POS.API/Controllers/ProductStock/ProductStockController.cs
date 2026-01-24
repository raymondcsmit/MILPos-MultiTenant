using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using POS.API.Helpers;
using POS.Data;
using POS.Data.Resources;
using POS.MediatR;

namespace POS.API.Controllers.ProductStock
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProductStockController(
        IMediator _mediator) : BaseController
    {

        /// <summary>
        /// Add Inventory
        /// </summary>
        /// <param name="command"></param>
        /// <returns></returns>
        [HttpPost]
        //[ClaimCheck("INVE_MANAGE_INVENTORY")]
        //[Produces("application/json", "application/xml", Type = typeof(InventoryDto))]
        public async Task<IActionResult> AddProductStock(AddProductStockCommand command)
        {
            var result = await _mediator.Send(command);
            return ReturnFormattedResponse(result);
        }

        /// <summary>
        /// Get All product stock.
        /// </summary>
        /// <param name="productStockResource"></param>
        /// <returns></returns>
        [HttpGet]
        [ClaimCheck("INVE_VIEW_INVENTORIES", "REP_STOCK_REPORT")]
        //[Produces("application/json", "application/xml", Type = typeof(InventoryList))]
        public async Task<IActionResult> GetProductStock([FromQuery] ProductStockResource productStockResource)
        {
            var getAllProductStockCommand = new GetAllProductStockCommand
            {
                ProductStockResource = productStockResource
            };
            var result = await _mediator.Send(getAllProductStockCommand);

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
        /// Get Inventory History.
        /// </summary>
        /// <param name="command"></param>
        /// <returns></returns>
        [HttpPost("check")]
        //[Produces("application/json", "application/xml", Type = typeof(CheckProductsInventoryCommand))]
        public async Task<IActionResult> CheckSaleOrderProductStock(CheckProductsStockCommand command)
        {
            var result = await _mediator.Send(command);
            return ReturnFormattedResponse(result);
        }
        /// <summary>
        /// get stock alert
        /// </summary>
        /// <param name="stockAlertResource"></param>
        /// <returns></returns>
        [HttpGet("stock-alert")]
        //[ClaimCheck("DB_PROD_STOCK_ALERT")]
        public async Task<IActionResult> GetProductStockAlert([FromQuery] ProductStockAlertResource stockAlertResource)
        {
            var getAllInventoryCommand = new GetProductStockAlertCommand
            {
                ProductStockAlertResource = stockAlertResource
            };

            var result = await _mediator.Send(getAllInventoryCommand);

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
        /// Get product Stock count.
        /// </summary>
        /// <param name="command"></param>
        /// <returns></returns>
        [HttpGet("count")]
        //[Produces("application/json", "application/xml", Type = typeof(CheckProductsInventoryCommand))]
        public async Task<IActionResult> GetProductStockCount([FromQuery] GetProductStockCountCommand command)
        {
            var result = await _mediator.Send(command);
            return ReturnFormattedResponse(result);
        }


    }
}
