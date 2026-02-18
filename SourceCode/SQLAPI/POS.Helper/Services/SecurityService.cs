using System;
using System.Security.Cryptography;
using POS.Common.Services;

namespace POS.Helper.Services
{
    public class SecurityService : ISecurityService
    {
        public string GenerateSecureApiKey()
        {
            using var rng = RandomNumberGenerator.Create();
            var bytes = new byte[32]; 
            rng.GetBytes(bytes);
            return Convert.ToBase64String(bytes)
                .Replace("+", "-")
                .Replace("/", "_")
                .TrimEnd('=');
        }
    }
}
