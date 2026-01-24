using MediatR;
using Microsoft.AspNetCore.Mvc;
using POS.Data.Dto;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using POS.MediatR;
using POS.MediatR.Variant;
using Microsoft.AspNetCore.Authorization;
using POS.API.Helpers;

namespace POS.API.Controllers.Variant
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]

    public class VariantController(IMediator mediator) : BaseController
    {

        /// <summary>
        /// Get Variants.
        /// </summary>
        /// <returns></returns>
        [HttpGet()]
        [Produces("application/json", "application/xml", Type = typeof(List<VariantDto>))]
        public async Task<IActionResult> GetVariantes()
        {
            var getAllVariantCommand = new GetAllVariantCommand { };
            var result = await mediator.Send(getAllVariantCommand);
            return ReturnFormattedResponse(result);
        }

        /// <summary>
        /// Create Variant.
        /// </summary>
        /// <param name="addVariantCommand"></param>
        /// <returns></returns>
        [HttpPost]
        [Produces("application/json", "application/xml", Type = typeof(VariantDto))]
        [ClaimCheck("PRO_MANAGE_VARIANTS")]
        public async Task<IActionResult> AddVariant(AddVariantCommand addVariantCommand)
        {
            var response = await mediator.Send(addVariantCommand);
            return ReturnFormattedResponse(response);
        }

        /// <summary>
        /// Update Variant.
        /// </summary>
        /// <param name="Id"></param>
        /// <param name="updateVariantCommand"></param>
        /// <returns></returns>
        [HttpPut("{Id}")]
        [Produces("application/json", "application/xml", Type = typeof(VariantDto))]
        [ClaimCheck("PRO_MANAGE_VARIANTS")]
        public async Task<IActionResult> UpdateVariant(Guid Id, UpdateVariantCommand updateVariantCommand)
        {
            updateVariantCommand.Id = Id;
            var result = await mediator.Send(updateVariantCommand);
            return ReturnFormattedResponse(result);

        }

        /// <summary>
        /// Delete Variant.
        /// </summary>
        /// <param name="Id"></param>
        /// <returns></returns>
        [HttpDelete("{Id}")]
        [ClaimCheck("PRO_MANAGE_VARIANTS")]
        public async Task<IActionResult> DeleteVariant(Guid Id)
        {
            var deleteVariantCommand = new DeleteVariantCommand { Id = Id };
            var result = await mediator.Send(deleteVariantCommand);
            return ReturnFormattedResponse(result);
        }
    }
}
