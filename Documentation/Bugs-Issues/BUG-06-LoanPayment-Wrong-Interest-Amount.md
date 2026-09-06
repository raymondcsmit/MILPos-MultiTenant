# Defect Report: BUG-06 (ACC-01)

**Bug ID:** BUG-06  
**Legacy Reference:** ACC-01 / TC-D06.035  
**Component:** Backend Accounting MediatR (`SourceCode/SQLAPI/POS.MediatR/LoanPayment/Handlers/AddLoanPaymentCommandHandler.cs`)  
**Module:** Financial Accounting & Loan Management  
**Severity:** **CRITICAL**  
**Reproducible:** 100% Deterministic  

---

## 1. Description & Impact

When recording a repayment on a loan that includes an interest component via `POST /api/loanpayment`, the handler books a debit entry for interest expense.
Instead of debiting the requested interest amount (`request.InterestAmount`), the code mistakenly debits the full principal loan amount (`loanDetail.LoanAmount`).

### Example:
- Loan Principal: $100,000.
- Monthly payment: $2,000 principal repayment + $500 interest.
- **Intended Accounting Entry:**
  - Credit Cash/Bank: $2,500
  - Debit Loan Payable (Liability): $2,000
  - Debit Interest Expense (Expense): $500
- **Actual Buggy Accounting Entry:**
  - Credit Cash/Bank: $2,500
  - Debit Loan Payable: $2,000
  - Debit Interest Expense: **$100,000** (Full loan principal!)
- **Consequence:**
  - The transaction is completely **out of balance** ($102,000 debit vs $2,500 credit).
  - Income statement expenses are artificially inflated by the full loan principal value on every single payment installment!

---

## 2. Root Cause Analysis

In `SourceCode/SQLAPI/POS.MediatR/LoanPayment/Handlers/AddLoanPaymentCommandHandler.cs`:
When constructing the `AddDirectJournalEntry` or `AccountingEntry` for interest expense:
```csharp
// BUGGY CODE:
Debit = loanDetail.LoanAmount // Should be request.InterestAmount!
```
The developer accidentally passed the loan entity's total loan amount instead of the payment request's interest amount.

---

## 3. Remediation Plan

1. In `AddLoanPaymentCommandHandler.cs`:
   - Change the interest amount assignment to `request.InterestAmount`.
   - Ensure interest entry is only posted when `request.InterestAmount > 0`.
2. Write unit tests in `Tests/POS.MediatR.Tests` verifying the created journal entries balance and debit the exact interest amount.
