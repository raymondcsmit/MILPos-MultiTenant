using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using POS.Data.Entities.Inventory;
using POS.MediatR.InventoryBatch.Queries;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace POS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class InventoryBatchController : ControllerBase
    {
        private readonly IMediator _mediator;

        public InventoryBatchController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("{productId}")]
        public async Task<ActionResult<IEnumerable<InventoryBatch>>> GetBatches(Guid productId)
        {
            var query = new GetInventoryBatchesQuery { ProductId = productId };
            var response = await _mediator.Send(query);

            if (response.Success)
            {
                return Ok(response.Data);
            }

            return BadRequest(new { message = string.Join(", ", response.Errors) });
        }
    }
}
