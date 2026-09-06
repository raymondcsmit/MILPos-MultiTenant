# Defect Report: BUG-14 (SYN-02 / SYNC-01)

**Bug ID:** BUG-14  
**Legacy Reference:** SYN-02 / SYNC-01 / TC-D10.005  
**Component:** Backend Domain (`SourceCode/SQLAPI/POS.Domain/Sync/SyncEngine.cs:212-218`)  
**Module:** Cloud Synchronization Engine (Push Conflict Handling)  
**Severity:** **HIGH**  
**Reproducible:** 100% Deterministic  

---

## 1. Description & Business Impact

When pushing local desktop changes to the remote cloud API, if the cloud server reports a version conflict (HTTP 409 Conflict, indicated by `updateResult.IsConflict == true`), `SyncEngine` executes the following code:
```csharp
if (updateResult.IsConflict)
{
    // Server has newer version
    _logger.LogWarning("Conflict detected for {EntityType}:{EntityId}", change.EntityType, change.EntityId);
    result.RecordsConflicted++;
    continue;
}
```
Notice what happens:
1. It increments `result.RecordsConflicted++`.
2. It executes `continue;`.
3. It **never marks the entity as synced**, which is correct, but it **never invokes `ConflictResolutionService`** to resolve the conflict, nor does it update the local entity with the server's version or record the conflict details for review.
4. Because the local record's `ModifiedDate` does not change, and `LastPushSync` moves forward (once BUG-09 is fixed), this conflicting entity is **permanently bypassed** and never pushed again unless modified locally a second time. This causes permanent divergence between local desktop data and cloud data.

---

## 2. Root Cause Analysis

While `ConflictResolutionService.cs` has comprehensive logic (`ServerWins`, `ClientWins`, `MergeFields`, `LastWriteWins`), it is only invoked during `PullChangesAsync` (when cloud changes are pulled to desktop). It was never wired into `PushChangesAsync` to reconcile push rejections.

---

## 3. Remediation Plan

1. In `SyncEngine.PushChangesAsync`, when `updateResult.IsConflict` is true:
   - Log the conflict with structured metadata.
   - Increment `result.RecordsConflicted`.
   - Ensure the conflict is recorded in the `SyncLog` entry so administrators have audit visibility.
