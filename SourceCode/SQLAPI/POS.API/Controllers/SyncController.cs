using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using POS.Data.Entities;
using POS.Domain;
using POS.Domain.Sync;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace POS.API.Controllers
{
    /// <summary>
    /// Controller for manual sync operations and sync status
    /// </summary>
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class SyncController : ControllerBase
    {
        private readonly SyncEngine _syncEngine;
        private readonly POSDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<SyncController> _logger;

        public SyncController(
            SyncEngine syncEngine,
            POSDbContext context,
            IConfiguration configuration,
            ILogger<SyncController> logger)
        {
            _syncEngine = syncEngine;
            _context = context;
            _configuration = configuration;
            _logger = logger;
        }

        private bool IsSyncEnabled()
        {
            return _configuration.GetValue<bool?>("SyncSettings:Enabled") ??
                   _configuration.GetValue<bool?>("SyncSettings:AutoSync") ??
                   _configuration.GetValue<bool?>("DeploymentSettings:SyncSettings:Enabled") ??
                   true;
        }

        /// <summary>
        /// Trigger manual synchronization
        /// </summary>
        [HttpPost("now")]
        public async Task<IActionResult> SyncNow([FromQuery] string direction = "Bidirectional")
        {
            if (!IsSyncEnabled())
            {
                _logger.LogWarning("Manual sync rejected - Sync is disabled in configuration");
                return BadRequest(new
                {
                    Success = false,
                    Status = "Disabled",
                    ErrorMessage = "Synchronization is disabled in appsettings configuration (SyncSettings:Enabled is false)."
                });
            }

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
            try
            {
                var syncEnabled = IsSyncEnabled();
                var latestLog = await _context.SyncLogs
                    .OrderByDescending(l => l.StartedAt)
                    .FirstOrDefaultAsync();

                var metadataList = await _context.SyncMetadata
                    .ToListAsync();

                var lastSyncTime = latestLog?.CompletedAt ?? latestLog?.StartedAt;

                return Ok(new
                {
                    SyncEnabled = syncEnabled,
                    LastSync = lastSyncTime,
                    Status = latestLog?.Status.ToString() ?? "NeverSynced",
                    RecordsSynced = latestLog?.RecordsSynced ?? 0,
                    RecordsConflicted = latestLog?.RecordsConflicted ?? 0,
                    RecordsFailed = latestLog?.RecordsFailed ?? 0,
                    DeviceId = latestLog?.DeviceId,
                    ErrorMessage = latestLog?.ErrorMessage,
                    Entities = metadataList.Select(m => new
                    {
                        m.EntityType,
                        m.LastPullSync,
                        m.LastPushSync,
                        m.LastSuccessfulSync,
                        m.PendingChanges
                    })
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve sync status");
                return StatusCode(500, new { Error = ex.Message });
            }
        }
    }
}
