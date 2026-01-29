using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using POS.Data.Entities.Inventory;
using POS.Domain;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace POS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class InventoryBatchController : ControllerBase
    {
        private readonly POSDbContext _context;

        public InventoryBatchController(POSDbContext context)
        {
            _context = context;
        }

        [HttpGet("{productId}")]
        public async Task<ActionResult<IEnumerable<InventoryBatch>>> GetBatches(Guid productId)
        {
            var batches = await _context.InventoryBatches
                                        .Where(b => b.ProductId == productId && b.Quantity > 0 && b.IsActive)
                                        .OrderBy(b => b.ExpiryDate)
                                        .ToListAsync();
            return Ok(batches);
        }
    }
}
