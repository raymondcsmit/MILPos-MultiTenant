using MediatR;
using Microsoft.AspNetCore.Mvc;
using POS.MediatR.TableSetting.Commands;
using System.Threading.Tasks;

namespace POS.API.Controllers.TableSettings
{
    [Route("api/[controller]")]
    [ApiController]
    public class TableSettingsController : ControllerBase
    {
        public IMediator _mediator { get; set; }
        public TableSettingsController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>
        /// Get Table settings by Screen Name
        /// </summary>
        /// <param name="screenName"></param>
        /// <returns></returns>

        [HttpGet("{screenName}")]
        public async Task<IActionResult> GetTableSettings(string screenName)
        {
            var query = new GetTableSettingsQuery { ScreenName = screenName };
            var result = await _mediator.Send(query);
            return Ok(result);
        }
        /// <summary>
        /// Add or Update Table Settings
        /// </summary>
        /// <param name="addOrUpdateTableSettingCommand"></param>
        /// <returns></returns>

        [HttpPost]
        public async Task<IActionResult> SaveTableSettings(AddOrUpdateTableSettingCommand addOrUpdateTableSettingCommand)
        {

            var result = await _mediator.Send(addOrUpdateTableSettingCommand);
            if (result.StatusCode != 200)
            {
                return StatusCode(result.StatusCode, result);
            }
            return StatusCode(result.StatusCode, result.Data);
        }
    }
}
