# Company Profile Image Fix Plan

## Goal Description
Fix issues preventing the Company Profile logo from updating correctly. The user reported that changing the logo "is not working". Potential issues identified:
1.  **Unsafe Filename Extraction**: `Path.GetExtension(request.LogoUrl)` might fail if `LogoUrl` is empty or null.
2.  **File Cleanup**: The old logo file is not deleted, leading to orphan files.
3.  **Error Swallowing**: File save errors are caught and logged, but the operation returns "Success" even if the image wasn't saved.

## Proposed Changes
### POS.MediatR
#### [MODIFY] [UpdateCompanyProfileCommandHandler.cs](file:///F:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.MediatR/CompanyProfile/Handlers/UpdateCompanyProfileCommandHandler.cs)
- Improve `Path.GetExtension` logic to handle null/empty `request.LogoUrl` safely (fallback to default extension or random name).
- Add logic to **delete the existing logo file** before/after saving the new one (similar to `UpdateUserProfileCommandHandler`).
- Improve error handling around file saving.

## Verification Plan
### Automated Tests
- No automated tests available for this specific UI interaction.
- Verification relies on code correctness.

### Manual Verification
1.  **Prerequisite**: Ensure the backend API is running.
2.  **Test**:
    - Go to Company Profile page (`/company-profile`).
    - Click "Change Logo" and select a new image.
    - Click "Save".
    - Verify the toaster says "Updated Successfully".
    - Refresh the page and verify the new logo persists.
    - Check the `wwwroot/CompanyLogo` folder (if accessible) to ensure the new file exists and the old one is gone (optional).
