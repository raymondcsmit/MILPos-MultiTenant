using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using POS.Data.Dto;
using POS.MediatR.MenuItem.Commands;
using POS.MediatR.MenuItem.Queries;
using System.Threading.Tasks;

namespace POS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class MenuItemsController : BaseController
    {
        private readonly IMediator _mediator;

        public MenuItemsController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("user-menu")]
        public async Task<IActionResult> GetUserMenu()
        {
            var userIdClaim = User.FindFirst("Id") ?? User.FindFirst("sub");
            if (userIdClaim == null) return Unauthorized();

            var query = new GetMenuItemsForUserQuery { UserId = System.Guid.Parse(userIdClaim.Value) };
            var result = await _mediator.Send(query);
            return ReturnFormattedResponse(result);
        }

        [HttpPost]
        [Authorize(Roles = "Super Admin")] 
        public async Task<IActionResult> CreateMenuItem([FromBody] CreateMenuItemCommand command)
        {
            var result = await _mediator.Send(command);
            return ReturnFormattedResponse(result);
        }
    }
}
