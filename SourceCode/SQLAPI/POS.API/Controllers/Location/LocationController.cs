using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using POS.API.Helpers;
using POS.Data.Dto;
using POS.MediatR.Location.Commands;

namespace POS.API.Controllers.Location
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class LocationController : ControllerBase
    {
        private readonly IMediator _mediator;
        public LocationController(IMediator mediator)
        {
            _mediator = mediator;
        }
        [HttpGet("{id}")]
        [Produces("application/json", "application/xml", Type = typeof(LocationDto))]
        [ClaimCheck("SETT_MANAGE_LOCATIONS")]
        public async Task<IActionResult> GetLocation(Guid id)
        {
            var query = new GetLocationCommand { Id = id };
            var result = await _mediator.Send(query);
            return Ok(result.Data);
        }

        [HttpGet]
        [Produces("application/json", "application/xml", Type = typeof(List<LocationDto>))]
        public async Task<IActionResult> GetLocations()
        {
            var query = new GetAllLocationCommand();
            var result = await _mediator.Send(query);
            return Ok(result);
        }
        /// <summary>
        /// add a new location.
        /// </summary>
        /// <param name="command">The command containing the location details to save.</param>
        /// <returns>The saved location details.</returns>
        [HttpPost]
        [Produces("application/json", "application/xml", Type = typeof(LocationDto))]
        [ClaimCheck("SETT_MANAGE_LOCATIONS")]
        public async Task<IActionResult> AddLocation(AddLocationCommand command)
        {
            var response = await _mediator.Send(command);
            if (!response.Success)
            {
                return BadRequest(response);
            }
            return CreatedAtAction(nameof(GetLocation), new { id = response.Data.Id }, response.Data);
        }

        /// <summary>
        /// Updates an existing location.
        /// </summary>
        /// <param name="id">The ID of the location to update.</param>
        /// <param name="command">The command containing the updated location details.</param>
        /// <returns>The updated location details.</returns>
        [HttpPut("{id}")]
        [Produces("application/json", "application/xml", Type = typeof(LocationDto))]
        [ClaimCheck("SETT_MANAGE_LOCATIONS")]
        public async Task<IActionResult> UpdateLocation(Guid id, UpdateLocationCommand command)
        {
            command.Id = id;
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        /// <summary>
        /// Deletes a location by its ID.
        /// </summary>
        /// <param name="id">The ID of the location to delete.</param>
        /// <returns>An IActionResult indicating the result of the operation.</returns>
        [HttpDelete("{id}")]
        [ClaimCheck("SETT_MANAGE_LOCATIONS")]
        public async Task<IActionResult> DeleteLocation(Guid id)
        {
            var command = new DeleteLocationCommand { Id = id };
            var result = await _mediator.Send(command);
            return Ok(result);
        }
    }
}
