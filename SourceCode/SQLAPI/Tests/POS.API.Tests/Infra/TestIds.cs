using System;

namespace POS.API.Tests.Infra;

/// <summary>
/// Fixed identifiers used by the canonical seed. Deterministic so test assertions can reference them.
/// </summary>
public static class TestIds
{
    public static readonly Guid TenantAId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    public static readonly Guid TenantBId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    public static readonly Guid AdminUserId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001");
    public static readonly Guid AdminRoleId = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000001");
    public static readonly Guid NoClaimsUserId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000002");
    public static readonly Guid NoClaimsRoleId = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000002");

    public static readonly Guid LocationL1Id = Guid.Parse("cccccccc-0000-0000-0000-000000000001");
    public static readonly Guid LocationFbrId = Guid.Parse("cccccccc-0000-0000-0000-000000000002");

    public static readonly Guid LedgerArId = Guid.Parse("dddddddd-0000-0000-0000-000000001100");
    public static readonly Guid LedgerSalesId = Guid.Parse("dddddddd-0000-0000-0000-000000004100");
    public static readonly Guid LedgerGstOutputId = Guid.Parse("dddddddd-0000-0000-0000-000000215001");
    public static readonly Guid LedgerGstOutputParentId = Guid.Parse("dddddddd-0000-0000-0000-000000215000");
    public static readonly Guid LedgerInventoryId = Guid.Parse("dddddddd-0000-0000-0000-000000001200");
    public static readonly Guid LedgerCogsId = Guid.Parse("dddddddd-0000-0000-0000-000000005100");
    public static readonly Guid LedgerDiscountId = Guid.Parse("dddddddd-0000-0000-0000-000000005200");
    public static readonly Guid LedgerRoundOffId = Guid.Parse("dddddddd-0000-0000-0000-000000005900");
    public static readonly Guid LedgerCashId = Guid.Parse("dddddddd-0000-0000-0000-000000001050");
    public static readonly Guid LedgerBankId = Guid.Parse("dddddddd-0000-0000-0000-000000001060");
    public static readonly Guid LedgerApId = Guid.Parse("dddddddd-0000-0000-0000-000000002100");
    public static readonly Guid LedgerGstInputId = Guid.Parse("dddddddd-0000-0000-0000-000000115001");
    public static readonly Guid LedgerGstInputParentId = Guid.Parse("dddddddd-0000-0000-0000-000000115000");

    public static readonly Guid TaxGst17Id = Guid.Parse("eeeeeeee-0000-0000-0000-000000000001");

    public static readonly Guid UnitPcId = Guid.Parse("f0f0f0f0-0000-0000-0000-000000000001");
    public static readonly Guid UnitDzId = Guid.Parse("f0f0f0f0-0000-0000-0000-000000000002");

    public static readonly Guid CategoryDefaultId = Guid.Parse("f1f1f1f1-0000-0000-0000-000000000001");

    public static readonly Guid ProductPcMonitorId = Guid.Parse("f2f2f2f2-0000-0000-0000-000000000001");
    public static readonly Guid ProductNoTaxId = Guid.Parse("f2f2f2f2-0000-0000-0000-000000000002");

    public static readonly Guid WalkInCustomerId = Guid.Parse("f3f3f3f3-0000-0000-0000-000000000001");

    public static readonly Guid PermissionsPageId = Guid.Parse("f4f4f4f4-0000-0000-0000-000000000001");
    public static readonly Guid PermissionsActionId = Guid.Parse("f5f5f5f5-0000-0000-0000-000000000001");

    public static readonly Guid SupplierS1Id = Guid.Parse("f6f6f6f6-0000-0000-0000-000000000001");
    public static readonly Guid SupplierS1AddressId = Guid.Parse("f7f7f7f7-0000-0000-0000-000000000001");

    public static readonly Guid ExpenseCategoryGeneralId = Guid.Parse("f8f8f8f8-0000-0000-0000-000000000001");

    public static readonly Guid InquirySourceWebId = Guid.Parse("f9f9f9f9-0000-0000-0000-000000000001");
    public static readonly Guid InquiryStatusOpenId = Guid.Parse("fafafafa-0000-0000-0000-000000000001");

    public static readonly Guid LedgerExpenseId = Guid.Parse("dddddddd-0000-0000-0000-000000005300");

    public static readonly Guid TenantBAdminUserId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000003");
    public static readonly Guid SuperAdminUserId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000004");
    public static readonly Guid TenantBProfileId = Guid.Parse("dddddddd-9999-0000-0000-00000000bbb0");
    public static readonly Guid LedgerAdjustmentId = Guid.Parse("dddddddd-0000-0000-0000-000000005400");
    public static readonly Guid FinancialYear2026Id = Guid.Parse("eeeeeeee-1111-1111-1111-111111111111");
}
