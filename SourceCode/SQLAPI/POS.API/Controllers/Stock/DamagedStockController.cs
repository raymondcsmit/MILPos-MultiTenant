using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using POS.API.Helpers;
using POS.Data.Dto;
using POS.Data.Resources;
using POS.MediatR.Stock.Commands;

namespace POS.API.Controllers.Stock
{

    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    /// <summary>
    /// Controller for managing damaged stock.
    /// </summary>
    public class DamagedStockController : BaseController
    {
        public IMediator _mediator { get; set; }

        /// <summary>
        /// Initializes a new instance of the <see cref="DamagedStockController"/> class.
        /// </summary>
        /// <param name="mediator">The mediator.</param>
        public DamagedStockController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>
        /// Get all damaged stocks.
        /// </summary>
        /// <returns>A list of damaged stock items.</returns>
        [HttpGet]
        [ClaimCheck("DMG_ST_VIEW_DMG_ST")]
        [Produces("application/json", "application/xml", Type = typeof(List<DamagedStockDto>))]
        public async Task<IActionResult> GetAllDamagedStocks([FromQuery] DamagedStockResource damagedStockResource)
        {
            var getAllDamagedStockQuery = new GetAllDamagedStockQuery
            {
                DamagedStockResource = damagedStockResource
            };
            var damagedStocks = await _mediator.Send(getAllDamagedStockQuery);

            var paginationMetadata = new
            {
                totalCount = damagedStocks.TotalCount,
                pageSize = damagedStocks.PageSize,
                skip = damagedStocks.Skip,
                totalPages = damagedStocks.TotalPages
            };

            Response.Headers.Append("X-Pagination",
                Newtonsoft.Json.JsonConvert.SerializeObject(paginationMetadata));

            return Ok(damagedStocks);
        }

        /// <summary>
        /// Create a new damaged stock entry.
        /// </summary>
        /// <param name="addDamagedStockCommand">The command to add damaged stock.</param>
        /// <returns>The created damaged stock item.</returns>
        [HttpPost]
        [Produces("application/json", "application/xml", Type = typeof(DamagedStockDto))]
        [ClaimCheck("DMG_ST_MANAGE_DMG_ST")]
        public async Task<IActionResult> CreateDamagedStock(AddDamagedStockCommand addDamagedStockCommand)
        {
            var result = await _mediator.Send(addDamagedStockCommand);
            return ReturnFormattedResponse(result);
        }
    }
}
