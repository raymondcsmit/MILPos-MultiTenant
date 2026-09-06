# Defect Report: BUG-08 (N-01 / SEC-09)

**Bug ID:** BUG-08  
**Legacy Reference:** N-01 / SEC-09 / TC-D10.002  
**Component:** Backend API (`SourceCode/SQLAPI/POS.API/Controllers/SyncController.cs`)  
**Module:** Desktop Cloud Synchronization API  
**Severity:** **CRITICAL**  
**Reproducible:** 100% Deterministic  
**Security Classification:** Broken Access Control (CWE-306 / OWASP A01:2021)

---

## 1. Description & Security Impact

The `SyncController` exposes two critical endpoints:
- `POST /api/sync/now?direction=...` (triggers resource-intensive database synchronization between desktop SQLite and remote cloud)
- `GET /api/sync/status` (reads sync telemetry and device identity)

Neither the controller class nor its action methods carry any `[Authorize]` or `[ClaimCheck]` attributes. As a result, an anonymous external network actor or unauthenticated client can trigger synchronization loops, execute denial-of-service (DoS) against the database and network interfaces, and probe internal sync telemetry without providing any credentials.

---

## 2. Root Cause Analysis

In `SourceCode/SQLAPI/POS.API/Controllers/SyncController.cs`:
```csharp
[ApiController]
[Route("api/[controller]")]
public class SyncController : ControllerBase
{
    private readonly SyncEngine _syncEngine;
    private readonly ILogger<SyncController> _logger;
    ...
    [HttpPost("now")]
    public async Task<IActionResult> SyncNow([FromQuery] string direction = "Bidirectional")
    ...
    [HttpGet("status")]
    public async Task<IActionResult> GetSyncStatus()
}
```
The class lacks `[Authorize]` at the class level or method level. In ASP.NET Core with minimal hosting and JWT Bearer authentication, unannotated controllers default to anonymous access (`AllowAnonymous`).

---

## 3. Reproduction Steps

1. Launch backend API on `http://localhost:5000`.
2. Send an anonymous HTTP POST request without any `Authorization` header:
   ```http
   POST /api/sync/now?direction=pull HTTP/1.1
   Host: localhost:5000
   ```
3. **Observed Behavior:** The server processes the request without returning HTTP 401 Unauthorized.
4. Send an anonymous HTTP GET request without any `Authorization` header:
   ```http
   GET /api/sync/status HTTP/1.1
   Host: localhost:5000
   ```
5. **Observed Behavior:** The server returns HTTP 200 OK.

---

## 4. Remediation Plan

1. Decorate `SyncController` with `[Authorize]`.
2. Ensure integration test `Should_Return401_When_SyncNowTriggeredUnauthenticated_GapTargetFixed` verifies that unauthenticated requests strictly return HTTP 401.
