using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using POS.Data.Dto;
using POS.Helper;
using POS.MediatR.DailyProductPrice.Commands;
using POS.MediatR.DailyProductPrice.Queries;
using System;
using System.Threading.Tasks;

namespace POS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DailyProductPriceController : BaseController
    {
        private readonly IMediator _mediator;

        public DailyProductPriceController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>
        /// Get daily price list for a specific date
        /// </summary>
        /// <param name="date">Price date (defaults to today)</param>
        /// <param name="groupBy">Group by Category or Brand</param>
        /// <returns>Daily price list with product details</returns>
        [HttpGet("price-list")]
        public async Task<IActionResult> GetDailyPriceList([FromQuery] DateTime? date, [FromQuery] string groupBy = "Category")
        {
            var query = new GetDailyPriceListQuery
            {
                PriceDate = date ?? DateTime.Today,
                GroupBy = groupBy
            };

            var result = await _mediator.Send(query);
            return Ok(result);
        }

        /// <summary>
        /// Update daily prices for multiple products
        /// </summary>
        /// <param name="command">Update command with price date and product prices</param>
        /// <returns>Success status</returns>
        [HttpPost("bulk-update")]
        public async Task<IActionResult> UpdateDailyPriceList([FromBody] UpdateDailyPriceListCommand command)
        {
            var result = await _mediator.Send(command);
            
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }

        /// <summary>
        /// Get effective price for a product on a specific date
        /// </summary>
        /// <param name="productId">Product ID</param>
        /// <param name="date">Price date (defaults to today)</param>
        /// <returns>Effective price</returns>
        [HttpGet("effective-price/{productId}")]
        public async Task<IActionResult> GetEffectivePrice(Guid productId, [FromQuery] DateTime? date)
        {
            // This would need a separate query/handler - placeholder for now
            return ReturnFormattedResponse(ServiceResponse<object>.ReturnResultWith200(new { ProductId = productId, EffectivePrice = 0m, Date = date ?? DateTime.Today }));
        }
    }
}
