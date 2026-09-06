# Defect Report: BUG-09 (N-06 / DATA-02)

**Bug ID:** BUG-09  
**Legacy Reference:** N-06 / DATA-02 / TC-D10.004  
**Component:** Backend Domain & API (`POS.Domain/Sync/SyncEngine.cs`, `POS.API/Controllers/SyncController.cs`)  
**Module:** Cloud Synchronization Engine & Telemetry  
**Severity:** **HIGH**  
**Reproducible:** 100% Deterministic  

---

## 1. Description & Impact

1. **Stale `LastPushSync` Timestamp:** In `SyncEngine.PushChangesAsync`, the engine queries local changes modified after `lastSync` (retrieved from `_changeTracker.GetSyncMetadata("All")`). However, after pushing all entity changes to the cloud, `SyncEngine` **never calls `UpdateSyncMetadata`** to advance the `LastPushSync` timestamp. Consequently, `LastPushSync` remains permanently at `DateTime.MinValue`. On every subsequent synchronization pass, the engine is forced to rescan every single table from the beginning of time, causing severe database I/O thrashing, network bandwidth waste, and increasing sync latency as the database grows.
2. **Unimplemented Telemetry Stub:** The telemetry endpoint `GET /api/sync/status` contains a `TODO` comment and returns a dummy static payload:
   ```json
   {
       "message": "Sync status endpoint - to be implemented",
       "lastSync": "2026-09-06T11:48:29.123Z"
   }
   ```
   The desktop UI and administrators have zero visibility into actual sync health, records synced/conflicted/failed, or device identifier.

---

## 2. Root Cause Analysis

### Stale Timestamp
In `SourceCode/SQLAPI/POS.Domain/Sync/SyncEngine.cs`:
```csharp
private async Task PushChangesAsync(SyncResult result)
{
    var metadata = await _changeTracker.GetSyncMetadata("All");
    var lastSync = metadata?.LastPushSync ?? DateTime.MinValue;
    
    var localChanges = await _changeTracker.GetLocalChanges(lastSync);
    ...
    // Loops over localChanges and calls cloudApiClient
    // BUT NEVER calls _changeTracker.UpdateSyncMetadata("All", ...)
}
```
Contrast this with `PullChangesAsync` in the same class at line 161, which explicitly calls:
```csharp
await _changeTracker.UpdateSyncMetadata(entityType, DateTime.UtcNow, isPull: true);
```

### Telemetry Stub
In `SourceCode/SQLAPI/POS.API/Controllers/SyncController.cs`:
```csharp
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
```

---

## 3. Remediation Plan

1. In `SyncEngine.PushChangesAsync`, after the change loop completes, invoke:
   ```csharp
   await _changeTracker.UpdateSyncMetadata("All", DateTime.UtcNow, isPull: false);
   ```
2. In `SyncController.GetSyncStatus`, inject `POSDbContext` or query `_syncEngine` / `_changeTracker` to retrieve the latest `SyncLog` record and `SyncMetadata` entries, returning:
   - `lastSyncTime`: Latest timestamp from `SyncMetadata` or `SyncLog`
   - `status`: Latest `SyncLogStatus` (`Completed`, `Failed`, etc.)
   - `recordsSynced`: Count from latest sync
   - `recordsConflicted`: Count from latest sync
   - `recordsFailed`: Count from latest sync
   - `deviceId`: Machine device identifier
   - `metadata`: List of entity sync timestamps
