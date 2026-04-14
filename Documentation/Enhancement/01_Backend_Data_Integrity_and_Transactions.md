# Backend Data Integrity & Transactions (Phase 1)

**Location:** `f:\MIllyass\pos-with-inventory-management\Documentation\Enhancement\01_Backend_Data_Integrity_and_Transactions.md`

## 1. Problem Statement
The Vibe Drift Audit detected critical data integrity vulnerabilities in complex MediatR Command Handlers (`UpdateExpenseCommandHandler`, `UpdatePurchaseOrderReturnCommandHandler`, and `AddStockTransferCommandHandler`). These handlers execute `_uow.SaveAsync()` multiple times (e.g., to retrieve auto-generated IDs before inserting child entities) without explicitly wrapping the operations in an `IDbContextTransaction`. If the application crashes or an exception is thrown mid-execution, partial data commits will corrupt the database state (e.g., deducting inventory but failing to record the financial expense).

## 2. Affected Components
- `SourceCode\SQLAPI\POS.MediatR\Expense\Handlers\UpdateExpenseCommandHandler.cs`
- `SourceCode\SQLAPI\POS.MediatR\PurchaseOrder\Update\UpdatePurchaseOrderReturnCommandHandler.cs`
- `SourceCode\SQLAPI\POS.MediatR\StockTransfer\Handlers\AddStockTransferCommandHandler.cs`

## 3. Remediation Strategy

**Objective:** Inject `IUnitOfWork` transaction boundaries to guarantee atomicity.

### 3.1 Refactoring Steps for Handlers
1. Ensure the `IUnitOfWork` interface (e.g., in `POS.Repository` or `POS.Common`) exposes transaction management methods:
   - `Task BeginTransactionAsync()`
   - `Task CommitTransactionAsync()`
   - `Task RollbackTransactionAsync()`
2. Wrap the execution block of the `Handle` method in a `try-catch` block.
3. Call `await _uow.BeginTransactionAsync()` at the start.
4. Execute all `_uow.SaveAsync()` operations.
5. Call `await _uow.CommitTransactionAsync()` at the end.
6. In the `catch` block, call `await _uow.RollbackTransactionAsync()` and log the error before returning a failed `ServiceResponse`.

### 3.2 Code Example (Remediation Pattern)
```csharp
public async Task<ServiceResponse<bool>> Handle(UpdateExpenseCommand request, CancellationToken cancellationToken)
{
    try
    {
        await _uow.BeginTransactionAsync();

        // Operation 1
        var expense = await _expenseRepository.GetByIdAsync(request.Id);
        // ... modifications ...
        if (await _uow.SaveAsync() <= 0)
        {
            await _uow.RollbackTransactionAsync();
            return ServiceResponse<bool>.ReturnFailed(500, "Failed to update expense.");
        }

        // Operation 2
        var transaction = new Transaction { /* ... */ };
        _transactionRepository.Add(transaction);
        if (await _uow.SaveAsync() <= 0)
        {
            await _uow.RollbackTransactionAsync();
            return ServiceResponse<bool>.ReturnFailed(500, "Failed to record transaction.");
        }

        await _uow.CommitTransactionAsync();
        return ServiceResponse<bool>.ReturnResultWith200(true);
    }
    catch (Exception ex)
    {
        await _uow.RollbackTransactionAsync();
        _logger.LogError(ex, "Data integrity error during expense update.");
        return ServiceResponse<bool>.ReturnException(ex);
    }
}
```

## 4. Verification & Testing
- Run `dotnet test` to ensure existing unit tests pass.
- Write new integration tests in `POS.API.Tests` that deliberately throw an exception midway through the handler (e.g., by mocking a repository dependency) and assert that no partial data was committed to the test database.
