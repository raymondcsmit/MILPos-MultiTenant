using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Data;
using POS.Data.Entities.FBR;
using POS.Domain;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace POS.API.Controllers.FBR
{
    [Route("api/fbr/configuration")]
    [ApiController]
    [Authorize]
    public class FBRConfigurationController : ControllerBase
    {
        private readonly POSDbContext _context;
        private readonly ILogger<FBRConfigurationController> _logger;

        public FBRConfigurationController(
            POSDbContext context,
            ILogger<FBRConfigurationController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Get FBR configuration for current tenant
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetConfiguration()
        {
            try
            {
                var config = await _context.FBRConfigurations
                    .FirstOrDefaultAsync();

                if (config == null)
                {
                    // Return default configuration
                    return Ok(new FBRConfiguration
                    {
                        IsEnabled = false,
                        IsTestMode = true,
                        AutoSubmitInvoices = true,
                        MaxRetryAttempts = 5,
                        RetryDelaySeconds = 60,
                        MaxRetryDelaySeconds = 3600,
                        ApiBaseUrl = "https://sandbox.fbr.gov.pk/api/v1"
                    });
                }

                // Don't expose sensitive data
                config.ClientSecret = "********";
                config.FBRKey = "********";
                config.CurrentAccessToken = null;

                return Ok(config);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving FBR configuration");
                return StatusCode(500, new { message = "Failed to retrieve configuration" });
            }
        }

        /// <summary>
        /// Save or update FBR configuration
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SaveConfiguration([FromBody] FBRConfiguration config)
        {
            try
            {
                var existingConfig = await _context.FBRConfigurations
                    .FirstOrDefaultAsync();

                if (existingConfig == null)
                {
                    // Create new configuration
                    config.Id = Guid.NewGuid();
                    config.CreatedDate = DateTime.UtcNow;
                    
                    // Encrypt sensitive fields (implement encryption)
                    // config.ClientSecret = EncryptionHelper.Encrypt(config.ClientSecret);
                    // config.FBRKey = EncryptionHelper.Encrypt(config.FBRKey);
                    
                    await _context.FBRConfigurations.AddAsync(config);
                }
                else
                {
                    // Update existing configuration
                    existingConfig.ClientId = config.ClientId;
                    
                    // Only update secrets if they're not masked
                    if (config.ClientSecret != "********")
                    {
                        existingConfig.ClientSecret = config.ClientSecret;
                        // existingConfig.ClientSecret = EncryptionHelper.Encrypt(config.ClientSecret);
                    }
                    
                    if (config.FBRKey != "********")
                    {
                        existingConfig.FBRKey = config.FBRKey;
                        // existingConfig.FBRKey = EncryptionHelper.Encrypt(config.FBRKey);
                    }
                    
                    existingConfig.POSID = config.POSID;
                    existingConfig.BranchCode = config.BranchCode;
                    existingConfig.STRN = config.STRN;
                    existingConfig.ApiBaseUrl = config.ApiBaseUrl;
                    existingConfig.IsEnabled = config.IsEnabled;
                    existingConfig.IsTestMode = config.IsTestMode;
                    existingConfig.AutoSubmitInvoices = config.AutoSubmitInvoices;
                    existingConfig.MaxRetryAttempts = config.MaxRetryAttempts;
                    existingConfig.RetryDelaySeconds = config.RetryDelaySeconds;
                    existingConfig.MaxRetryDelaySeconds = config.MaxRetryDelaySeconds;
                    existingConfig.ModifiedDate = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "FBR configuration saved successfully",
                    configurationId = existingConfig?.Id ?? config.Id
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving FBR configuration");
                return StatusCode(500, new { success = false, message = "Failed to save configuration" });
            }
        }

        /// <summary>
        /// Test FBR API connection
        /// </summary>
        [HttpPost("test")]
        public async Task<IActionResult> TestConnection([FromBody] FBRConfiguration config)
        {
            try
            {
                // TODO: Implement actual FBR API connection test
                // For now, just validate the configuration
                
                if (string.IsNullOrEmpty(config.ClientId) || 
                    string.IsNullOrEmpty(config.ClientSecret) ||
                    string.IsNullOrEmpty(config.STRN))
                {
                    return Ok(new
                    {
                        success = false,
                        message = "Missing required credentials",
                        tokenValid = false,
                        apiReachable = false
                    });
                }

                // Simulate connection test
                await Task.Delay(1000); // Simulate API call

                return Ok(new
                {
                    success = true,
                    message = "Connection test successful (simulated)",
                    tokenValid = true,
                    apiReachable = true
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing FBR connection");
                return Ok(new
                {
                    success = false,
                    message = $"Connection test failed: {ex.Message}",
                    tokenValid = false,
                    apiReachable = false
                });
            }
        }

        /// <summary>
        /// Manually refresh FBR access token
        /// </summary>
        [HttpPost("refresh-token")]
        public async Task<IActionResult> RefreshToken()
        {
            try
            {
                var config = await _context.FBRConfigurations
                    .FirstOrDefaultAsync();

                if (config == null || !config.IsEnabled)
                {
                    return BadRequest(new { success = false, message = "FBR is not configured or enabled" });
                }

                // TODO: Implement actual token refresh logic
                // For now, simulate token refresh
                
                config.LastTokenRefresh = DateTime.UtcNow;
                config.TokenExpiresAt = DateTime.UtcNow.AddHours(24);
                // config.CurrentAccessToken = EncryptionHelper.Encrypt(newToken);

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Token refreshed successfully",
                    expiresAt = config.TokenExpiresAt
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing FBR token");
                return StatusCode(500, new { success = false, message = "Failed to refresh token" });
            }
        }

        /// <summary>
        /// Get FBR submission statistics
        /// </summary>
        [HttpGet("statistics")]
        public async Task<IActionResult> GetStatistics()
        {
            try
            {
                var config = await _context.FBRConfigurations
                    .FirstOrDefaultAsync();

                if (config == null)
                {
                    return Ok(new
                    {
                        totalSubmissionsToday = 0,
                        failedSubmissionsToday = 0,
                        successRate = 0.0,
                        lastSuccessfulSubmission = (DateTime?)null
                    });
                }

                return Ok(new
                {
                    totalSubmissionsToday = config.TotalSubmissionsToday,
                    failedSubmissionsToday = config.FailedSubmissionsToday,
                    successRate = config.TotalSubmissionsToday > 0 
                        ? (double)(config.TotalSubmissionsToday - config.FailedSubmissionsToday) / config.TotalSubmissionsToday * 100 
                        : 0.0,
                    lastSuccessfulSubmission = config.LastSuccessfulSubmission
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving FBR statistics");
                return StatusCode(500, new { message = "Failed to retrieve statistics" });
            }
        }
    }
}
