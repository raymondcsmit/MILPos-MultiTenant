using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using POS.API.Helpers;
using POS.Data.Resources;
using POS.MediatR;
using POS.MediatR.Accouting;
using POS.MediatR.CommandAndQuery;
using System;
using System.IO;
using System.Threading.Tasks;

namespace POS.API.Controllers.Accounting
{
    /// <summary>
    /// Controller for Payroll
    /// </summary>
    /// <param name="_mediator"></param>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PayRollController(
        IMediator _mediator) : BaseController
    {
        /// <summary>
        /// Create A Payroll
        /// </summary>
        /// <param name="command"></param>
        /// <returns></returns>
        [HttpPost]
        [ClaimCheck("PAY_ROLL_MANAGE_PAY_ROLL")]
        public async Task<IActionResult> CreatePayroll([FromForm] AddPayrollCommand command)
        {
            var result=await _mediator.Send(command);
            return GenerateResponse(result);
        }

        /// <summary>
        /// Get Payroll list.
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        [ClaimCheck("PAY_ROLL_VIEW_PAY_ROLLS")]
        public async Task<IActionResult> GetPayRolls([FromQuery] PayrollResource payrollResource)
        {
            var query = new GetAllPayRollCommand()
            {
                PayrollResource = payrollResource
            };
            var result = await _mediator.Send(query);
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
        /// Download payroll Reciept by Attachment name
        /// </summary>
        /// <param name="attachmentName"></param>
        /// <returns></returns>
        [HttpGet("download/{attachmentName}")]
        public async Task<IActionResult> DownloadPayrollReciept(string attachmentName)
        {
           
            var commnad = new DownloadPayrollreceiptCommand
            {
                AttachmentName = attachmentName,
            };
            var path = await _mediator.Send(commnad);

            if (string.IsNullOrWhiteSpace(path) || !System.IO.File.Exists(path))
                return NotFound("File not found.");

            byte[] newBytes;
            await using (var stream = new FileStream(path, FileMode.Open))
            {
                byte[] bytes = new byte[stream.Length];
                int numBytesToRead = (int)stream.Length;
                int numBytesRead = 0;
                while (numBytesToRead > 0)
                {
                    // Read may return anything from 0 to numBytesToRead.
                    int n = stream.Read(bytes, numBytesRead, numBytesToRead);

                    // Break when the end of the file is reached.
                    if (n == 0)
                        break;

                    numBytesRead += n;
                    numBytesToRead -= n;
                }
                newBytes = bytes;
            }
            return File(newBytes, GetContentType(path), attachmentName);
        }

        /// <summary>
        /// Get A Payroll
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetPayroll(Guid id)
        {
            var result = await _mediator.Send(new GetPayrollCommad() { Id=id});
            return GenerateResponse(result);
        }


        /// <summary>
        /// Searches the employee.
        /// </summary>
        /// <param name="searchQuery">The search query.</param>
        /// <param name="pageSize">Size of the page.</param>
        /// <returns></returns>
        [HttpGet("employeeSearch")]
        public async Task<IActionResult> employeeSearch(string searchQuery, int pageSize)
        {
            var query = new SearchEmployeeQuery
            {
                PageSize = pageSize,
                SearchQuery = searchQuery
            };
            var result = await _mediator.Send(query);
            return Ok(result);
        }


        private string GetContentType(string path)
        {
            var provider = new FileExtensionContentTypeProvider();
            if (!provider.TryGetContentType(path, out var contentType))
            {
                contentType = "application/octet-stream";
            }
            return contentType;
        }
    }
}
