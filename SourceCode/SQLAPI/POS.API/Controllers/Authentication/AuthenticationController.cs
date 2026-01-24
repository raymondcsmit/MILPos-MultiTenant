using MediatR;
using Microsoft.AspNetCore.Mvc;
using POS.Data.Dto;
using POS.MediatR;
using POS.MediatR.CommandAndQuery;
using System.Linq;
using System.Threading.Tasks;

namespace POS.API.Controllers.Authentication
{
    [Route("api")]
    [ApiController]
    public class AuthenticationController : BaseController
    {
        public IMediator _mediator;
        public AuthenticationController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>
        /// User Login
        /// </summary>
        /// <param name="userLoginCommand"></param>
        /// <returns></returns>
        [HttpPost("authentication")]
        [Produces("application/json", "application/xml", Type = typeof(UserAuthDto))]
        public async Task<IActionResult> Login(UserLoginCommand userLoginCommand)
        {
            userLoginCommand.RemoteIp = Request.HttpContext.Request.Headers["CF-Connecting-IP"].FirstOrDefault() ?? Request.HttpContext.Connection.RemoteIpAddress.ToString();
            var result = await _mediator.Send(userLoginCommand);
            return ReturnFormattedResponse(result);
        }

        /// <summary>
        /// forget password
        /// </summary>
        /// <param name="forgetPasswordCommand"></param>
        /// <returns></returns>
        [HttpPost("forgotpassword")]
        public async Task<IActionResult> ForgetPassowrd(ForgetPasswordCommand forgetPasswordCommand)
        {
            var result = await _mediator.Send(forgetPasswordCommand);
            return ReturnFormattedResponse(result);
        }

        /// <summary>
        /// get reset password info
        /// </summary>
        /// <param name="token"></param>
        /// <returns></returns>
        [HttpGet("resetpassword/{token}")]
        public async Task<IActionResult> GetResetPassowrdinfo(string token)
        {
            var resetPasswordCommand = new GetResetPasswordInfoCommand
            {
                Token = token
            };
            var result = await _mediator.Send(resetPasswordCommand);
            return ReturnFormattedResponse(result);
        }

        /// <summary>
        /// recover password.
        /// </summary>
        /// <param name="token"></param>
        /// <param name="recoverPasswordCommand"></param>
        /// <returns></returns>
        [HttpPost("recoverpassword/{token}")]
        public async Task<IActionResult> RecoverPassowrdinfo(string token, RecoverPasswordCommand recoverPasswordCommand)
        {
            recoverPasswordCommand.Token = token;
            var result = await _mediator.Send(recoverPasswordCommand);
            return ReturnFormattedResponse(result);
        }
    }
}
