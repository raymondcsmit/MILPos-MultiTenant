using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using POS.Data.Resources;
using POS.MediatR.CommandAndQuery;

namespace POS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NotificationController(
        IMediator mediator) : BaseController
    {
        /// <summary>
        /// Gets the reminder.
        /// </summary>
        /// <param name="id">The identifier.</param>
        /// <returns></returns>
        [HttpGet("top10")]
        [Produces("application/json", "application/xml")]
        public async Task<IActionResult> GetTop10ReminderNotification()
        {
            var getTop10ReminderNotificationQuery = new GetTop10ReminderNotificationQuery
            {
            };

            var result = await mediator.Send(getTop10ReminderNotificationQuery);
            return Ok(result);
        }
        /// <summary>
        /// Gets the reminder.
        /// </summary>
        /// <param name="id">The identifier.</param>
        /// <returns></returns>
        [HttpGet("all")]
        [Produces("application/json", "application/xml")]
        public async Task<IActionResult> GetNotifications([FromQuery] ReminderResource reminderResource)
        {
            var getAllReminderNotificationQuery = new GetAllReminderNotificationQuery
            {
                ReminderResource = reminderResource
            };

            var result = await mediator.Send(getAllReminderNotificationQuery);

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
        /// mark all notification as read.
        /// </summary>
        /// <returns></returns>
        [HttpPost("markAllAsRead")]
        [Produces("application/json", "application/xml")]
        public async Task<IActionResult> GetNotificationMarkasRead()
        {
            var markAsReadAllNotificationsCommand = new MarkAsReadAllNotificationsCommand { };

            var result = await mediator.Send(markAsReadAllNotificationsCommand);

            return Ok(result);
        }

        /// <summary>
        /// Get Use Notification Count.
        /// </summary>
        /// <returns></returns>
        [HttpGet("count")]
        [Produces("application/json", "application/xml", Type = typeof(int))]
        public async Task<IActionResult> GetUserNotificationCount()
        {
            var getUserNotificationCountQuery = new GetUserNotificationCountQuery { };
            var result = await mediator.Send(getUserNotificationCountQuery);
            return Ok(result);
        }
    }
}
