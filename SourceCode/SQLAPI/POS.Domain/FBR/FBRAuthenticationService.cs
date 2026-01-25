using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Domain;
using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;

namespace POS.Domain.FBR
{
    /// <summary>
    /// Service for managing FBR OAuth2 authentication and token lifecycle
    /// </summary>
    public class FBRAuthenticationService : IFBRAuthenticationService
    {
        private readonly POSDbContext _context;
        private readonly HttpClient _httpClient;
        private readonly ILogger<FBRAuthenticationService> _logger;

        public FBRAuthenticationService(
            POSDbContext context,
            HttpClient httpClient,
            ILogger<FBRAuthenticationService> logger)
        {
            _context = context;
            _httpClient = httpClient;
            _logger = logger;
        }

        /// <summary>
        /// Get valid access token, automatically refreshing if expired
        /// </summary>
        public async Task<string> GetAccessTokenAsync()
        {
            var config = await GetFBRConfigurationAsync();

            if (config == null || !config.IsEnabled)
            {
                throw new InvalidOperationException("FBR is not configured or enabled");
            }

            // Check if token exists and is still valid
            if (!string.IsNullOrEmpty(config.CurrentAccessToken) && 
                config.TokenExpiresAt.HasValue && 
                config.TokenExpiresAt.Value > DateTime.UtcNow.AddMinutes(5))
            {
                // Token is still valid (with 5-minute buffer)
                return config.CurrentAccessToken;
            }

            // Token is expired or doesn't exist, refresh it
            _logger.LogInformation("FBR token expired or missing, refreshing...");
            return await RefreshTokenAsync();
        }

        /// <summary>
        /// Manually refresh FBR access token
        /// </summary>
        public async Task<string> RefreshTokenAsync()
        {
            var config = await GetFBRConfigurationAsync();

            if (config == null)
            {
                throw new InvalidOperationException("FBR configuration not found");
            }

            try
            {
                _logger.LogInformation("Requesting new FBR access token");

                // Prepare OAuth2 token request
                var tokenRequest = new
                {
                    grant_type = "client_credentials",
                    client_id = config.ClientId,
                    client_secret = config.ClientSecret, // TODO: Decrypt if encrypted
                    scope = "invoice"
                };

                // Call FBR OAuth2 token endpoint
                var tokenEndpoint = $"{config.ApiBaseUrl}/oauth/token";
                var response = await _httpClient.PostAsJsonAsync(tokenEndpoint, tokenRequest);

                if (!response.IsSuccessStatusCode)
                {
                    var error = await response.Content.ReadAsStringAsync();
                    _logger.LogError("FBR token request failed: {Error}", error);
                    throw new Exception($"Failed to obtain FBR token: {error}");
                }

                var tokenResponse = await response.Content.ReadFromJsonAsync<FBRTokenResponse>();

                if (tokenResponse == null || string.IsNullOrEmpty(tokenResponse.AccessToken))
                {
                    throw new Exception("Invalid token response from FBR");
                }

                // Update configuration with new token
                config.CurrentAccessToken = tokenResponse.AccessToken; // TODO: Encrypt before saving
                config.TokenExpiresAt = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn);
                config.LastTokenRefresh = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("FBR token refreshed successfully, expires at {ExpiresAt}", config.TokenExpiresAt);

                return tokenResponse.AccessToken;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing FBR token");
                throw;
            }
        }

        /// <summary>
        /// Check if current token is valid
        /// </summary>
        public async Task<bool> IsTokenValidAsync()
        {
            var config = await GetFBRConfigurationAsync();

            if (config == null || string.IsNullOrEmpty(config.CurrentAccessToken))
            {
                return false;
            }

            if (!config.TokenExpiresAt.HasValue)
            {
                return false;
            }

            // Check if token expires in more than 5 minutes
            return config.TokenExpiresAt.Value > DateTime.UtcNow.AddMinutes(5);
        }

        private async Task<Data.Entities.FBR.FBRConfiguration> GetFBRConfigurationAsync()
        {
            return await _context.FBRConfigurations
                .FirstOrDefaultAsync(c => c.IsEnabled);
        }

        // Internal DTO for token response
        private class FBRTokenResponse
        {
            public string AccessToken { get; set; }
            public string TokenType { get; set; }
            public int ExpiresIn { get; set; } // Seconds
            public string Scope { get; set; }
        }
    }
}
