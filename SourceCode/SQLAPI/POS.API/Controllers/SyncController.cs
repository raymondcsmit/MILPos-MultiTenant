using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using POS.Data.Entities;
using POS.Domain.Sync;
using System;
using System.Threading.Tasks;

namespace POS.API.Controllers
{
    /// <summary>
    /// Controller for manual sync operations and sync status
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class SyncController : ControllerBase
    {
        private readonly SyncEngine _syncEngine;
        private readonly ILogger<SyncController> _logger;

        public SyncController(SyncEngine syncEngine, ILogger<SyncController> logger)
        {
            _syncEngine = syncEngine;
            _logger = logger;
        }

        /// <summary>
        /// Trigger manual synchronization
        /// </summary>
        [HttpPost("now")]
        public async Task<IActionResult> SyncNow([FromQuery] string direction = "Bidirectional")
        {
            try
            {
                SyncDirection syncDirection = direction.ToLower() switch
                {
                    "pull" => SyncDirection.Pull,
                    "push" => SyncDirection.Push,
                    _ => SyncDirection.Bidirectional
                };

                var result = await _syncEngine.SynchronizeAsync(new SyncOptions
                {
                    Direction = syncDirection
                });

                return Ok(new
                {
                    Success = result.Status == SyncLogStatus.Completed,
                    Status = result.Status.ToString(),
                    RecordsSynced = result.RecordsSynced,
                    RecordsConflicted = result.RecordsConflicted,
                    RecordsFailed = result.RecordsFailed,
                    Duration = (result.CompletedAt - result.StartedAt)?.TotalSeconds,
                    StartedAt = result.StartedAt,
                    CompletedAt = result.CompletedAt,
                    ErrorMessage = result.ErrorMessage
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Manual sync failed");
                return StatusCode(500, new { Error = ex.Message });
            }
        }

        /// <summary>
        /// Get sync status and history
        /// </summary>
        [HttpGet("status")]
        public async Task<IActionResult> GetSyncStatus()
        {
            // TODO: Implement sync status retrieval from SyncLog table
            return Ok(new
            {
                Message = "Sync status endpoint - to be implemented",
                LastSync = DateTime.UtcNow
            });
        }
    }
}
