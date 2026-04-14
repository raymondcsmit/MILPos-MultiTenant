using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using POS.Common.Services;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;

namespace POS.Helper.Services
{
    public class LicenseTokenService : ILicenseTokenService
    {
        private readonly JwtSecurityTokenHandler _handler = new JwtSecurityTokenHandler();
        private readonly string _issuer;
        private readonly string _audience;
        private readonly SymmetricSecurityKey _signingKey;

        public LicenseTokenService(IConfiguration configuration)
        {
            var signingKey = configuration["LicensingSettings:SigningKey"];
            if (string.IsNullOrWhiteSpace(signingKey))
            {
                signingKey = configuration["JwtSettings:key"];
            }

            _issuer = configuration["LicensingSettings:Issuer"] ?? "MILPOS";
            _audience = configuration["LicensingSettings:Audience"] ?? "MILPOS";

            _signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey ?? string.Empty));
        }

        public string IssueToken(Guid tenantId, string plan, DateTime? expiresAt, int? maxUsers, string tokenId)
        {
            var claims = new List<Claim>
            {
                new Claim("typ", "milpos-license"),
                new Claim("tenantId", tenantId.ToString()),
                new Claim("plan", plan ?? string.Empty),
                new Claim(JwtRegisteredClaimNames.Jti, tokenId ?? string.Empty)
            };

            if (maxUsers.HasValue)
            {
                claims.Add(new Claim("maxUsers", maxUsers.Value.ToString(CultureInfo.InvariantCulture)));
            }

            var token = new JwtSecurityToken(
                issuer: _issuer,
                audience: _audience,
                claims: claims,
                notBefore: DateTime.UtcNow,
                expires: expiresAt,
                signingCredentials: new SigningCredentials(_signingKey, SecurityAlgorithms.HmacSha256));

            return _handler.WriteToken(token);
        }

        public bool TryValidateToken(string token, out LicenseTokenPayload payload, out string error)
        {
            payload = null;
            error = string.Empty;

            if (string.IsNullOrWhiteSpace(token))
            {
                error = "Token is required.";
                return false;
            }

            try
            {
                var parameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = _signingKey,
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = false,
                    ClockSkew = TimeSpan.Zero
                };

                _handler.ValidateToken(token, parameters, out var validatedToken);
                if (validatedToken is not JwtSecurityToken jwt)
                {
                    error = "Invalid token format.";
                    return false;
                }

                var typ = jwt.Claims.FirstOrDefault(c => c.Type == "typ")?.Value;
                if (!string.Equals(typ, "milpos-license", StringComparison.OrdinalIgnoreCase))
                {
                    error = "Invalid license token type.";
                    return false;
                }

                var tenantIdStr = jwt.Claims.FirstOrDefault(c => c.Type == "tenantId")?.Value;
                if (!Guid.TryParse(tenantIdStr, out var tenantId))
                {
                    error = "Invalid tenantId claim.";
                    return false;
                }

                var plan = jwt.Claims.FirstOrDefault(c => c.Type == "plan")?.Value ?? string.Empty;
                var tokenId = jwt.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Jti)?.Value ?? string.Empty;

                int? maxUsers = null;
                var maxUsersStr = jwt.Claims.FirstOrDefault(c => c.Type == "maxUsers")?.Value;
                if (!string.IsNullOrWhiteSpace(maxUsersStr) && int.TryParse(maxUsersStr, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsedMaxUsers))
                {
                    maxUsers = parsedMaxUsers;
                }

                DateTime? expiresAt = null;
                if (jwt.ValidTo != DateTime.MinValue && jwt.ValidTo != DateTime.MaxValue)
                {
                    expiresAt = jwt.ValidTo.ToUniversalTime();
                }

                payload = new LicenseTokenPayload
                {
                    TenantId = tenantId,
                    Plan = plan,
                    ExpiresAt = expiresAt,
                    MaxUsers = maxUsers,
                    TokenId = tokenId
                };

                if (expiresAt.HasValue && DateTime.UtcNow > expiresAt.Value)
                {
                    error = "License token is expired.";
                    return false;
                }

                return true;
            }
            catch (Exception ex)
            {
                error = ex.Message;
                return false;
            }
        }
    }
}

