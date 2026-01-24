using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using POS.API.Helpers;
using POS.Data.Dto;
using POS.MediatR.PageHelper.Commands;

namespace POS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PageHelperController : BaseController
    {
        public IMediator _mediator { get; set; }

        public PageHelperController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>
        /// Get Specific page helper by ID.
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpGet("{id}")]
        [Produces("application/json", "application/xml", Type = typeof(PageHelperDto))]
        [ClaimCheck("SETT_MANAGE_PAGE_HELPER")]
        public async Task<IActionResult> GetPageHelper(Guid id)
        {
            var getPageHelperCommand = new GetPageHelperCommand { Id = id };
            var result = await _mediator.Send(getPageHelperCommand);
            return GenerateResponse(result);
        }

        /// <summary>
        /// get page helper by code.
        /// </summary>
        /// <param name="code"></param>
        /// <returns></returns>
        [HttpGet("code/{code}")]
        [Produces("application/json", "application/xml", Type = typeof(PageHelperDto))]
        public async Task<IActionResult> GetPageHelperByCode(string code)
        {
            var getPageHelperCommand = new GetPageHelperByCodeCommand { Code = code };
            var result = await _mediator.Send(getPageHelperCommand);
            return GenerateResponse(result);
        }

        /// <summary>
        /// Get All page helpers.
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        [Produces("application/json", "application/xml", Type = typeof(List<PageHelperDto>))]
        [ClaimCheck("SETT_MANAGE_PAGE_HELPER")]
        public async Task<IActionResult> GetPageHelpers()
        {
            var getAllPageHelpers = new GetAllPageHelpersCommand();
            var result = await _mediator.Send(getAllPageHelpers);
            return Ok(result);
        }

        /// <summary>
        /// Create a page Helper.
        /// </summary>
        [HttpPost]
        [Produces("application/json", "application/xml", Type = typeof(PageHelperDto))]
        [ClaimCheck("SETT_MANAGE_PAGE_HELPER")]
        public async Task<IActionResult> AddPageHelper([FromBody] AddPageHelperCommand addPageHelperCommand)
        {
            var result = await _mediator.Send(addPageHelperCommand);
            return GenerateResponse(result);
        }

        /// <summary>
        /// Update Update Helper.
        /// </summary>
        /// <param name="Id"></param>
        /// <param name="updatePageHelperCommand"></param>
        /// <returns></returns>
        [HttpPost("{Id}")]
        [Produces("application/json", "application/xml", Type = typeof(PageHelperDto))]
        [ClaimCheck("SETT_MANAGE_PAGE_HELPER")]
        public async Task<IActionResult> UpdatePageHelper(Guid Id, [FromBody] UpdatePageHelperCommand updatePageHelperCommand)
        {
            updatePageHelperCommand.Id = Id;
            var result = await _mediator.Send(updatePageHelperCommand);
            return GenerateResponse(result);

        }
        
        /// <summary>
        /// Delete Page Helper.
        /// </summary>
        /// <param name="Id"></param>
        /// <returns></returns>
        [HttpDelete("{Id}")]
        [ClaimCheck("SETT_MANAGE_PAGE_HELPER")]
        public async Task<IActionResult> DeletePageHelper(Guid Id)
        {
            var deletePageHelperCommand = new DeletePageHelperCommand
            {
                Id = Id
            };
            var result = await _mediator.Send(deletePageHelperCommand);
            return GenerateResponse(result);
        }
    }
}
