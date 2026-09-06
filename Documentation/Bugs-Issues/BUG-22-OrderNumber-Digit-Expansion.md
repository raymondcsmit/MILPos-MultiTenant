# BUG-22: Order Number Sequential Generation Corrupts Zero-Padding on Boundary Increment (N-13 / Medium)

**Document Reference:** `Documentation/Bugs-Issues/BUG-22-OrderNumber-Digit-Expansion.md`  
**Finding Code:** `N-13` / `BIZ-01`  
**Severity:** 🟡 **MEDIUM**  
**Component:** Backend MediatR / Sales & Purchase Orders / `GetNewSalesOrderNumberQueryHandler.cs`, `GetNewPurchaseOrderNumberQueryHandler.cs`  
**Status:** **Documented & Fixed**  

---

## 1. Description of Defect

In `GetNewSalesOrderNumberQueryHandler` and `GetNewPurchaseOrderNumberQueryHandler`, new sequential order numbers were generated using string replacement:
```csharp
var soId = Regex.Match(lastSoNumber, @"\d+").Value;
var isNumber = int.TryParse(soId, out int soNumber);
if (isNumber)
{
    var newPoId = lastSoNumber.Replace(soNumber.ToString(), "");
    return $"{newPoId}{soNumber + 1}";
}
```
When `lastSoNumber` was `SO#00009`:
1. `soNumber` parsed as `9`.
2. `lastSoNumber.Replace("9", "")` stripped the single `9`, leaving `"SO#0000"`.
3. Appending `soNumber + 1` (`10`) generated `"SO#000010"`, expanding a 5-digit zero-padded number into a 6-digit number!
4. Subsequent increments behaved inconsistently (`SO#000010` -> `SO#000011`, etc.).

---

## 2. Root Cause Analysis

The naive `.Replace(soNumber.ToString(), "")` assumed that replacing the unpadded integer representation would leave the exact leading zeros required, which fails whenever incrementing across decade boundaries (e.g. 9 to 10, 99 to 100). Furthermore, if the prefix contained numbers (e.g. branch codes or dates), `.Replace` could corrupt other parts of the identifier.

---

## 3. Remediation & Implementation

Decomposed the order number using regex anchoring:
```csharp
var match = Regex.Match(lastSoNumber, @"^(.*?)(\d+)$");
if (match.Success && int.TryParse(match.Groups[2].Value, out int soNumber))
{
    var prefix = match.Groups[1].Value;
    var digitsLength = match.Groups[2].Value.Length;
    var nextNumber = soNumber + 1;
    return $"{prefix}{nextNumber.ToString().PadLeft(digitsLength, '0')}";
}
else
{
    return $"{lastSoNumber}#00001";
}
```
Applied across:
- `GetNewSalesOrderNumberQueryHandler.cs` (Sales Orders & Requests).
- `GetNewPurchaseOrderNumberQueryHandler.cs` (Purchase Orders & Requests).

This guarantees:
- `SO#00009` -> `SO#00010` (5 digits preserved).
- `SO#00099` -> `SO#00100` (5 digits preserved).
- `PO#00009` -> `PO#00010` (5 digits preserved).

---

## 4. Automated Verification

- Added integration tests in `OrderNumberingTests.cs`:
  - `Should_IncrementSalesOrderNumber_PreservingFiveDigits_When_LastNumberEndsInNine` (asserts `SO#00010`).
  - `Should_IncrementSalesOrderNumber_When_LastNumberIsDoubleNine` (asserts `SO#00100`).
  - `Should_IncrementPurchaseOrderNumber_PreservingFiveDigits_When_LastNumberEndsInNine` (asserts `PO#00010`).
