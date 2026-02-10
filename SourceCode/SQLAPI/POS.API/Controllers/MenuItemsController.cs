using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using POS.API.Helpers;
using POS.Data.Dto;
using POS.MediatR.MenuItem.Commands;
using POS.MediatR.MenuItem.Queries;
using System.Threading.Tasks;
using System;

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
        [ClaimCheck("MENU_VIEW_MENUS")]
        public async Task<IActionResult> GetUserMenu()
        {
            var userIdClaim = User.FindFirst("Id") ?? User.FindFirst("sub") ?? User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized();

            var query = new GetMenuItemsForUserQuery { UserId = System.Guid.Parse(userIdClaim.Value) };
            var result = await _mediator.Send(query);
            return ReturnFormattedResponse(result);
        }

        [HttpPost]
        [ClaimCheck("MENU_ADD_MENU")]
        public async Task<IActionResult> CreateMenuItem([FromBody] CreateMenuItemCommand command)
        {
            var result = await _mediator.Send(command);
            return ReturnFormattedResponse(result);
        }

        [HttpPut("{id}")]
        [ClaimCheck("MENU_UPDATE_MENU")]
        public async Task<IActionResult> UpdateMenuItem(Guid id, [FromBody] UpdateMenuItemCommand command)
        {
            if (id != command.Id)
            {
                return BadRequest();
            }
            var result = await _mediator.Send(command);
            return ReturnFormattedResponse(result);
        }

        [HttpDelete("{id}")]
        [ClaimCheck("MENU_DELETE_MENU")]
        public async Task<IActionResult> DeleteMenuItem(Guid id)
        {
            var command = new DeleteMenuItemCommand { Id = id };
            var result = await _mediator.Send(command);
            return ReturnFormattedResponse(result);
        }
    }
}
