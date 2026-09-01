-- =====================================================================
-- PILOT USER / DIRECT-CASH COMPANY TRIAL-EXPIRATION EXEMPTION
-- ---------------------------------------------------------------------
-- Purpose: Permanently exempt pilot companies (who pay directly / cash)
-- from the trial-expiration block in TrialEnforcementMiddleware.
--
-- Why TWO updates (a) and (b):
--   The middleware checks the Licenses table FIRST (before the tenant's
--   'Paid' check). If a pilot tenant still has an 'Active' license whose
--   ExpiresAt is in the past, they will STILL be blocked with
--   "License Expired. Please Renew License." even after marking them Paid.
--   So: (a) mark the tenant Paid, AND (b) neutralize any expired Active
--   license row for that tenant.
--
-- HOW TO USE:
--   Replace 'your-subdomain' with the pilot tenant's ACTUAL subdomain,
--   OR replace it with the tenant's Id GUID (see the inline "OR:" comments).
--   Run BOTH (a) and (b) for your database platform.
--
-- After running: results are cached 5-10 min in IMemoryCache. If it still
-- blocks briefly, wait a few minutes or restart the app.
-- =====================================================================


-- =====================================================================
-- 1) SQL SERVER
-- =====================================================================
-- (a) Mark the pilot company as permanently Paid (middleware bypass)
UPDATE dbo.Tenants
SET LicenseType           = 'Paid',
    SubscriptionPlan      = 'Paid',
    TrialExpiryDate       = NULL,
    SubscriptionEndDate   = NULL,
    SubscriptionStartDate = GETUTCDATE(),
    IsActive              = 1
WHERE Subdomain = 'your-subdomain';   -- OR: Id = 'GUID-HERE'

-- (b) Neutralize expired Active licenses (runs-first check)
UPDATE l
SET l.Status     = 'Expired',
    l.IsDeleted  = 1
FROM dbo.Licenses l
JOIN dbo.Tenants t ON t.Id = l.TenantId
WHERE t.Subdomain = 'your-subdomain'
  AND l.Status = 'Active'
  AND l.IsDeleted = 0
  AND l.ExpiresAt IS NOT NULL
  AND l.ExpiresAt < GETUTCDATE();


-- =====================================================================
-- 2) POSTGRESQL
-- =====================================================================
-- (a) Mark the pilot company as permanently Paid
UPDATE "Tenants"
SET "LicenseType"           = 'Paid',
    "SubscriptionPlan"      = 'Paid',
    "TrialExpiryDate"       = NULL,
    "SubscriptionEndDate"   = NULL,
    "SubscriptionStartDate" = NOW(),
    "IsActive"              = TRUE
WHERE "Subdomain" = 'your-subdomain';   -- OR: "Id" = 'GUID-HERE'::uuid

-- (b) Neutralize expired Active licenses (runs-first check)
UPDATE "Licenses" l
SET "Status"     = 'Expired',
    "IsDeleted"  = TRUE
FROM "Tenants" t
WHERE t."Id" = l."TenantId"
  AND t."Subdomain" = 'your-subdomain'
  AND l."Status" = 'Active'
  AND l."IsDeleted" = FALSE
  AND l."ExpiresAt" IS NOT NULL
  AND l."ExpiresAt" < NOW();


-- =====================================================================
-- 3) SQLITE
-- =====================================================================
-- (a) Mark the pilot company as permanently Paid
UPDATE Tenants
SET LicenseType           = 'Paid',
    SubscriptionPlan      = 'Paid',
    TrialExpiryDate       = NULL,
    SubscriptionEndDate   = NULL,
    SubscriptionStartDate = datetime('now'),
    IsActive              = 1
WHERE Subdomain = 'your-subdomain';   -- OR: Id = 'GUID-HERE'

-- (b) Neutralize expired Active licenses (runs-first check)
UPDATE Licenses
SET Status    = 'Expired',
    IsDeleted = 1
WHERE TenantId = (SELECT Id FROM Tenants WHERE Subdomain = 'your-subdomain')
  AND Status = 'Active'
  AND IsDeleted = 0
  AND ExpiresAt IS NOT NULL
  AND ExpiresAt < datetime('now');
