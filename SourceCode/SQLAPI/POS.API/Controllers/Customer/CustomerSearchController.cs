using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using POS.API.Controllers.Supplier;
using POS.MediatR.CommandAndQuery;
using System.Threading.Tasks;

namespace POS.API.Controllers.Customer
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CustomerSearchController : ControllerBase
    {
        private readonly IMediator _mediator;

        /// <summary>
        /// Initializes a new instance of the <see cref="CustomerSearchController"/> class.
        /// </summary>
        /// <param name="mediator">The mediator.</param>
        public CustomerSearchController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>
        /// Searches the suppliers.
        /// </summary>
        /// <param name="searchQuery">The search query.</param>
        /// <param name="pageSize">Size of the page.</param>
        /// <param name="isPOS"></param>
        /// <returns></returns>
        [HttpGet(Name = "customerSearch")]
        public async Task<IActionResult> CustomerSearch(string searchQuery, int pageSize, bool isPOS)
        {
            var query = new SearchCustomerQuery
            {
                PageSize = pageSize,
                SearchQuery = searchQuery,
                IsPOS = isPOS
            };
            var result = await _mediator.Send(query);
            return Ok(result);
        }
    }
}
