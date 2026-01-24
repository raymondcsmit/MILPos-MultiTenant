using System;
using System.IO;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using POS.API.Helpers;
using POS.Data.Resources;
using POS.Helper;
using POS.MediatR.CommandAndQuery;
using POS.MediatR.EmailLog.Commands;
using POS.Repository;

namespace POS.API.Controllers.EmailLog
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class EmailLogController : ControllerBase
    {
        public IMediator _mediator { get; set; }
        private readonly PathHelper _pathHelper;
        private readonly IWebHostEnvironment _webHostEnvironment;

        public EmailLogController(IMediator mediator, PathHelper pathHelper, IWebHostEnvironment webHostEnvironment)
        {
            _mediator = mediator;
            _pathHelper = pathHelper;
            _webHostEnvironment = webHostEnvironment;
        }

        /// <summary>
        /// Get All Email Log detail
        /// </summary>
        /// <param name="emailLogResource"></param>
        /// <returns></returns>
        [HttpGet]
        [Produces("application/json", "application/xml", Type = typeof(EmailLogList))]
        [ClaimCheck("LOGS_VIEW_EMAIL_LOGS")]
        public async Task<IActionResult> GetEmailLog([FromQuery] EmailLogResource emailLogResource)
        {
            var getAllLoginAuditQuery = new GetAllEmailLogQuery
            {
                EmailLogResource = emailLogResource
            };
            var result = await _mediator.Send(getAllLoginAuditQuery);

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
        /// Deletes a Email log by its ID.
        /// </summary>
        /// <param name="id">The ID of the email log to delete.</param>
        /// <returns>An IActionResult indicating the result of the operation.</returns>
        [HttpDelete("{id}")]
        [ClaimCheck("LOGS_DELETE_EMAIL_LOG")]
        public async Task<IActionResult> DeleteEmailLog(Guid id)
        {
            var command = new DeleteEmailLogCommand { Id = id };
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        /// <summary>
        /// Download email attachment by ID
        /// </summary>
        [HttpGet("{id}/download")]
        [ClaimCheck("LOGS_VIEW_EMAIL_LOGS")]
        public async Task<IActionResult> DownloadAttachment(Guid id)
        {
            var query = new GetEmailAttachmentQuery { Id = id };
            var attachment = await _mediator.Send(query);

            if (attachment == null)
            {
                return NotFound("File Not Found.");
            }

            if (!attachment.Success)
            {
                return NotFound("File Not Found.");
            }

            var attachmentPath = Path.Combine(_webHostEnvironment.WebRootPath, attachment.Data.Path);
            if (!System.IO.File.Exists(attachmentPath))
            {
                return NotFound();
            }
            var fileBytes = await System.IO.File.ReadAllBytesAsync(attachmentPath);
            return File(fileBytes, "application/json", attachment.Data.Name);
        }
    }
}
