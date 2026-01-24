using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Primitives;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;

namespace POS.API.Helpers;

public class ClaimCheckAttribute : Attribute, IActionFilter
{
    private readonly string[] _claimNames;

    public ClaimCheckAttribute(params string[] claimNames)
    {
        _claimNames = claimNames;
    }

    /// <inheritdoc/>
    public void OnActionExecuted(ActionExecutedContext context)
    {
    }

    /// <inheritdoc/>
    public void OnActionExecuting(ActionExecutingContext context)
    {
        context.HttpContext.Request.Headers.TryGetValue("Authorization", out StringValues auth);

        if (auth.Count == 0)
        {
            context.Result = new StatusCodeResult(StatusCodes.Status403Forbidden);
            return;
        }

        var tokenValue = auth[0].Replace("Bearer ", "");
        string[] claimArray = new string[] { };
        JwtSecurityToken token;
        Claim claim = null;

        if (_claimNames.Length > 1)
        {
            claimArray = _claimNames;
        }
        token = new JwtSecurityTokenHandler().ReadJwtToken(tokenValue);
        if (claimArray.Length > 0)
        {
            for (int i = 0; i < claimArray.Length; i++)
            {
                claim = token.Claims.Where(c => c.Type.ToLower().Trim() == claimArray[i].ToLower().Trim() && c.Value == "true").FirstOrDefault();

                if (claim != null)
                {
                    break;
                }
            }
        }
        else
        {
            claim = token.Claims.Where(c => c.Type.ToLower() == _claimNames[0].ToLower() && c.Value == "true").FirstOrDefault();
        }

        if (claim == null)
        {
            context.Result = new StatusCodeResult(StatusCodes.Status403Forbidden);
        }
    }
}