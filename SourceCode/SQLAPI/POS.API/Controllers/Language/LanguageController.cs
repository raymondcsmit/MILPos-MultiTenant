using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using POS.API.Helpers;
using POS.Data.Dto;
using POS.Helper;
using POS.MediatR.Language.Commands;

namespace POS.API.Controllers.Data
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class LanguageController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly PathHelper _pathHelper;

        public LanguageController(IMediator mediator, PathHelper pathHelper, IWebHostEnvironment webHostEnvironment)
        {
            _mediator = mediator;
            _pathHelper = pathHelper;
            _webHostEnvironment = webHostEnvironment;
        }

        /// <summary>
        /// get language
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpGet("{id}")]
        [Produces("application/json", "application/xml", Type = typeof(LanguageDto))]
        [ClaimCheck("SETT_MANAGE_LAN")]
        public async Task<IActionResult> GetLanguage(Guid id)
        {
            var query = new GetLanguageCommand { Id = id };
            var result = await _mediator.Send(query);
            return Ok(result.Data);
        }

        /// <summary>
        /// get languages
        /// </summary>
        /// <returns></returns>
        [HttpGet]
        [Produces("application/json", "application/xml", Type = typeof(List<LanguageDto>))]
        [ClaimCheck("SETT_MANAGE_LAN")]
        public async Task<IActionResult> GetLanguages()
        {
            var query = new GetAllLanguageCommand();
            var result = await _mediator.Send(query);
            return Ok(result);
        }

        /// <summary>
        /// Downloads a language file from the server.
        /// </summary>
        /// <param name="fileName">The name of the file to download.</param>
        /// <returns>The file content as a downloadable file.</returns>
        [HttpGet("download/{fileName}")]
        [AllowAnonymous]
        public async Task<IActionResult> DownloadFile(string fileName)
        {
            var filePath = Path.Combine(_webHostEnvironment.WebRootPath,_pathHelper.LanguagePath, fileName);
            if (!System.IO.File.Exists(filePath))
            {
                return NotFound();
            }
            var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
            return File(fileBytes, "application/json", fileName);
        }

        /// <summary>
        /// Gets the default language file content.
        /// </summary>
        /// <returns>The default language file content as a JSON string.</returns>
        [HttpGet("default")]
        public async Task<IActionResult> DefaultLanguage()
        {
            var filePath = Path.Combine(_webHostEnvironment.WebRootPath,_pathHelper.LanguagePath, "default.json");
            if (!System.IO.File.Exists(filePath))
            {
                return NotFound();
            }
            var fileContent = await System.IO.File.ReadAllTextAsync(filePath);
            return Ok(fileContent);
        }

        /// <summary>
        /// Saves a new language.
        /// </summary>
        /// <param name="command">The command containing the language details to save.</param>
        /// <returns>The saved language details.</returns>
        [HttpPost]
        [Produces("application/json", "application/xml", Type = typeof(LanguageDto))]
        [ClaimCheck("SETT_MANAGE_LAN")]
        public async Task<IActionResult> SaveLanguage(AddLanguageCommand command)
        {
            var response = await _mediator.Send(command);
            if (!response.Success)
            {
                return BadRequest(response);
            }
            return CreatedAtAction(nameof(GetLanguage), new { id = response.Data.Id }, response.Data);
        }

        /// <summary>
        /// Updates an existing language.
        /// </summary>
        /// <param name="id">The ID of the language to update.</param>
        /// <param name="command">The command containing the updated language details.</param>
        /// <returns>The updated language details.</returns>
        [HttpPut("{id}")]
        [Produces("application/json", "application/xml", Type = typeof(LanguageDto))]
        [ClaimCheck("SETT_MANAGE_LAN")]
        public async Task<IActionResult> UpdateLanguage(Guid id, UpdateLanguageCommand command)
        {
            command.Id = id;
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        /// <summary>
        /// Deletes a language by its ID.
        /// </summary>
        /// <param name="id">The ID of the language to delete.</param>
        /// <returns>An IActionResult indicating the result of the operation.</returns>
        [HttpDelete("{id}")]
        [ClaimCheck("SETT_MANAGE_LAN")]
        public async Task<IActionResult> DeleteLanguage(Guid id)
        {
            var command = new DeleteLanguageCommand { Id = id };
            var result = await _mediator.Send(command);
            return Ok(result);
        }
    }
}
