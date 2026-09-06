# BUG-17: `EmailController.SendSalesOrdPurchase` Missing `[ClaimCheck]` Authorization Gate

**Defect ID:** BUG-17 (`N-02` / `SEC-10`)  
**Severity:** 🟠 High  
**Subsystem:** Email Communications & System Security (`POS.API`)  
**Status:** **FIXED & VERIFIED**  
**Root Cause File:** [`SourceCode/SQLAPI/POS.API/Controllers/Email/EmailController.cs`](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Controllers/Email/EmailController.cs#L41-L47)  

---

## 1. Description & Vulnerability Analysis

In `EmailController.cs`:
- The standard `SendEmail` action properly enforced permissions:
  ```csharp
  [HttpPost(Name = "SendEmail")]
  [ClaimCheck("EMAIL_SEND_EMAIL")]
  public async Task<IActionResult> SendEmail(SendEmailCommand sendEmailCommand)
  ```
- However, the second dispatch endpoint `salesOrPurchase` (`POST /api/Email/salesOrPurchase`) omitted the `[ClaimCheck]` attribute entirely:
  ```csharp
  [HttpPost("salesOrPurchase")]
  public async Task<IActionResult> SendSalesOrdPurchase(SendSalesOrPurchaseCommand addSendEmailSuppliersCommand)
  ```
Because `[ClaimCheck]` was omitted, any authenticated JWT holder (even an unprivileged viewer or cashier with no email-sending permissions) could execute arbitrary email dispatches to suppliers and customers.

---

## 2. Remediation

Added `[ClaimCheck("EMAIL_SEND_EMAIL")]` to `SendSalesOrdPurchase` in `EmailController.cs`:
```csharp
[HttpPost("salesOrPurchase")]
[ClaimCheck("EMAIL_SEND_EMAIL")]
public async Task<IActionResult> SendSalesOrdPurchase(SendSalesOrPurchaseCommand addSendEmailSuppliersCommand)
{
    var result = await _mediator.Send(addSendEmailSuppliersCommand);
    return Ok(result);
}
```

---

## 3. Verification

- **Automated Integration Test:**
  - `EmailAndReportsGateTests.Should_Return401_When_SendSalesOrPurchaseUnauthenticated_GapTargetFixed`
  - `EmailAndReportsGateTests.Should_Return403_When_SendSalesOrPurchaseWithoutClaim_GapTargetFixed`
- **Result:** **PASSED** (unauthenticated rejected with 401; user without claim rejected with 403 Forbidden).
