using System;
using System.Threading.Tasks;

namespace POS.Domain.FBR
{
    /// <summary>
    /// Service interface for FBR authentication and token management
    /// </summary>
    public interface IFBRAuthenticationService
    {
        /// <summary>
        /// Get current valid access token (refreshes if expired)
        /// </summary>
        /// <returns>Valid access token</returns>
        Task<string> GetAccessTokenAsync();

        /// <summary>
        /// Manually refresh access token
        /// </summary>
        /// <returns>New access token</returns>
        Task<string> RefreshTokenAsync();

        /// <summary>
        /// Check if current token is valid
        /// </summary>
        /// <returns>True if token is valid and not expired</returns>
        Task<bool> IsTokenValidAsync();
    }
}
