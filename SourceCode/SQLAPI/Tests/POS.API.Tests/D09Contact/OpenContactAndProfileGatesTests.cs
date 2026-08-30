using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using POS.API.Tests.Infra;
using Xunit;

namespace POS.API.Tests.D09Contact;

/// <summary>
/// D09 contact + profile surface. ContactUs create/list/delete carry no [Authorize] and no
/// [ClaimCheck] — an UNAUTHENTICATED client can write and read contact messages (N-42 Gap-Target
/// pin). CompanyProfile read is unclaimed (any authenticated user), while its update and
/// license-activation writes are SETT_UPDATE_COM_PROFILE-claimed.
/// </summary>
public sealed class OpenContactAndProfileGatesTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public OpenContactAndProfileGatesTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_PostAndReadContactUs_When_Unauthenticated_GapTargetN42()
    {
        await _factory.EnsureSeededAsync();
        var anon = _factory.CreateClient();

        var posted = await anon.PostAsJsonAsync("/api/ContactUs", new
        {
            name = "Walk-in",
            email = "walkin@example.com",
            phone = "0100000000",
            message = "N-42 probe"
        });
        Assert.True(
            posted.IsSuccessStatusCode,
            $"ContactUs create -> {(int)posted.StatusCode} {await posted.Content.ReadAsStringAsync()}");

        var listed = await anon.GetAsync("/api/ContactUs");
        Assert.True(listed.IsSuccessStatusCode, $"ContactUs list -> {(int)listed.StatusCode}");
    }

    [Fact]
    public async Task Should_GateCompanyProfileWrites_By_Claim()
    {
        await _factory.EnsureSeededAsync();
        var no = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        Assert.True((await no.GetAsync("/api/CompanyProfile")).IsSuccessStatusCode, "CompanyProfile read should be unclaimed");

        Assert.Equal(HttpStatusCode.Forbidden, (await no.PostAsJsonAsync("/api/CompanyProfile", new
        {
            title = "Probe",
            phone = "0100000000",
            email = "admin@milpos.example"
        })).StatusCode);

        Assert.Equal(HttpStatusCode.Forbidden, (await no.PostAsJsonAsync("/api/CompanyProfile/activate_license", new
        {
            purchaseCode = "probe"
        })).StatusCode);
    }
}