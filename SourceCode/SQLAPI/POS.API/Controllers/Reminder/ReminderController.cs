using POS.Data.Dto;
using POS.Data.Resources;
using POS.MediatR.CommandAndQuery;
using POS.MediatR.Handlers;
using POS.Repository;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using POS.API.Helpers;

namespace POS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReminderController : BaseController
    {
        public IMediator _mediator { get; set; }

        /// <summary>
        /// Initializes a new instance of the <see cref="ReminderController"/> class.
        /// </summary>
        /// <param name="mediator">The mediator.</param>
        public ReminderController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>
        /// Gets the reminders.
        /// </summary>
        /// <param name="reminderResource">The reminder resource.</param>
        /// <returns></returns>
        [HttpGet("GetReminders")]
        [ClaimCheck("REM_VIEW_REMINDERS")]
        [Produces("application/json", "application/xml", Type = typeof(ReminderList))]
        public async Task<IActionResult> GetReminders([FromQuery] ReminderResource reminderResource)
        {
            var getAllReminderQuery = new GetAllReminderQuery
            {
                ReminderResource = reminderResource
            };

            var result = await _mediator.Send(getAllReminderQuery);

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
        /// Creates the reminder.
        /// </summary>
        /// <param name="addReminderCommand">The add reminder command.</param>
        /// <returns></returns>
        [HttpPost]
        [Produces("application/json", "application/xml", Type = typeof(ReminderDto))]
        public async Task<IActionResult> CreateReminder(AddReminderCommand addReminderCommand)
        {
            var result = await _mediator.Send(addReminderCommand);
            return Ok(result);
        }

        /// <summary>
        /// Gets the reminder.
        /// </summary>
        /// <param name="id">The identifier.</param>
        /// <returns></returns>
        [HttpGet("{id}")]
        [Produces("application/json", "application/xml", Type = typeof(ReminderList))]
        public async Task<IActionResult> GetReminder(Guid id)
        {
            var getReminderByIdQuery = new GetReminderByIdQuery
            {
                Id = id
            };

            var result = await _mediator.Send(getReminderByIdQuery);

            return ReturnFormattedResponse(result);
        }

        /// <summary>
        /// Updates the reminder.
        /// </summary>
        /// <param name="id">The identifier.</param>
        /// <param name="updateReminderCommand">The update reminder command.</param>
        /// <returns></returns>
        [HttpPut("{id}")]
        [ClaimCheck("REM_UPDATE_REMINDER")]
        [Produces("application/json", "application/xml", Type = typeof(ReminderDto))]
        public async Task<IActionResult> UpdateReminder(Guid id, UpdateReminderCommand updateReminderCommand)
        {
            var result = await _mediator.Send(updateReminderCommand);
            return ReturnFormattedResponse(result);
        }

        /// <summary>
        /// Deletes the reminder.
        /// </summary>
        /// <param name="id">The identifier.</param>
        /// <returns></returns>
        [HttpDelete("{id}")]
        [ClaimCheck("REM_DELETE_REMINDER")]
        [Produces("application/json", "application/xml", Type = typeof(bool))]
        public async Task<IActionResult> DeleteReminder(Guid id)
        {
            var deleteReminderCommaond = new DeleteReminderCommand { Id = id };
            var result = await _mediator.Send(deleteReminderCommaond);
            return ReturnFormattedResponse(result);
        }

  
    }
}
