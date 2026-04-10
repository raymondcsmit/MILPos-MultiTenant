# Refactoring Plan: File Handling & Error Management

## Goal Description
1.  **Centralize File Handling**: Introduce a generic `IFileStorageService` to handle file I/O operations, ensuring safe paths (AppData fallback), permission handling, and automatic cleanup of old files. This replaces ad-hoc `System.IO` calls and the `FileData` helper.
2.  **Global Error Handling**: Implement a Global Exception Middleware to catch unhandled exceptions (especially `UnauthorizedAccessException`) and return a standardized, user-friendly JSON response (500 Internal Server Error with details) instead of crashing or hanging the UI.

## Affected Areas
### Codebase
- **New Service**: `POS.Common.Services.FileStorageService` (and interface) - **[DONE]**
- **Configuration**: `Startup.cs` (Register service, Add Middleware) - **[DONE]**
- **Helpers**: 
    - `POS.Helper.SaveFileInfo.cs`: Will be refactored to use `IFileStorageService` or deprecated.
- **Handlers (List of affected files to refactor)**:
    - **User**: `UpdateUserProfileCommandHandler` **[DONE]**, `AddUserCommandHandler` **[DONE]**, `UpdateUserCommandHandler` **[DONE]**, `UpdateUserProfilePhotoCommandHandler` **[DONE]**, `UserLoginCommandHandler` **[DONE]**.
    - **Company**: `UpdateCompanyProfileCommandHandler` **[DONE]**.
    - **Product**: `AddProductCommandHandler` **[DONE]**, `UpdateProductCommandHandler` **[DONE]**.
    - **Brand**: `AddBrandCommandHandler` **[DONE]**, `UpdateBrandCommandHandler` **[DONE]**.
    - **Supplier**: `AddSupplierCommandHandler` **[DONE]**, `UpdateSupplierCommandHandler` **[DONE]**, `RemovedSupplierImageCommandHandler` **[DONE]**.
    - **Customer**: `AddCustomerCommandHandler` **[DONE]**, `UpdateCustomerCommandHandler` **[DONE]**.
    - **Expense**: `AddExpenseCommandHandler` **[DONE]**, `UpdateExpenseCommandHandler` **[DONE]**.
    - **Inquiry**: `AddInquiryAttachmentCommandHandler` **[DONE]**.
    - **Language**: `AddLanguageCommandHandler` **[DONE]**, `UpdateLanguageCommandHandler` **[DONE]**.
    - **Email**: `DeleteEmailLogCommandHandler` **[DONE]**.

## Implementation Detail

### 1. File Storage Service
Create `IFileStorageService` in `POS.Common`.
```csharp
public interface IFileStorageService
{
    Task<string> SaveFileAsync(string folderPath, byte[] fileContent, string fileName);
    Task<string> SaveFileAsync(string folderPath, string base64Data, string fileName);
    Task<string> SaveThumbnailAsync(string folderPath, string base64Data, string fileName); // Moves logic from SaveFileInfo
    void DeleteFile(string relativeFilePath);
    string GetPhysicalPath(string relativePath);
}
```
**Key Logic:**
- **Dynamic Root Path**: Resolves `WebRootPath` vs `AppData` dynamically based on permissions/config.
- **Cleanup**: `DeleteFile` deletes from both `WebRoot` and `AppData` to ensure no orphans.
- **Safety**: Wraps all IO in Try/Catch to avoid crashing.

### 2. Global Exception Middleware
Create `POS.API.Middleware.GlobalExceptionHandlerMiddleware`.
**Logic:**
- Catch `Exception`.
- Log Error (with Stack Trace).
- Return `500` status code.
- Body: `{ message = "An internal error occurred. Please contact support.", detail = ex.Message (if specific env) }`.

## Verification Plan

### Automated Tests
- No automated tests available.

### Manual Verification
1.  **Product Image Test**:
    - Add a new Product with Image. Verify it saves.
    - Edit Product, change image. Verify old image (if any) is deleted and new one saved.
2.  **Brand Image Test**:
    - Add new Brand with Image.
3.  **Error Handling Test**:
    - Force an exception and verify JSON response.
4.  **Permission Test**:
    - If possible, verify "Access Denied" fallback works (as verified in User Profile fix).
