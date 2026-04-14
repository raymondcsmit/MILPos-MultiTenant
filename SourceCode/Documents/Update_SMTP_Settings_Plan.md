# Update SMTP Settings Implementation Plan

## Goal Description
Fix potential issues in SMTP settings, specifically the handling of `EncryptionType` between Frontend and Backend, and ensure proper email sending configuration.

## Proposed Changes

### Backend - POS.Repository
#### [MODIFY] [EmailRepository.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Repository/Email/EmailRepository.cs)
- Update `SendEmail` method to handle empty string as `SecureSocketOptions.None` if intended, or clarify the mapping.
- Align `EncryptionType` valid values with Frontend.
  - Frontend values: `""` (None), `"ssl"`, `"tls"`, `"starttls"`.
  - Current Backend checks: `"None"`, `"ssl"`, `"tls"`, `"starttls"`.
  - **Correction**: Change Backend to check for `string.IsNullOrEmpty` or match Frontend value for None.

### Frontend - Angular (Optional)
- If we decide to change Frontend value instead.

## Verification Plan
### Manual Verification
- Update SMTP settings in UI with different Encryption types.
- Send test emails.
