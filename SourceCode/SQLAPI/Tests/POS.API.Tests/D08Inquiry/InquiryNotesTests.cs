using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.API.Tests.Infra;
using POS.Data.Entities;
using Xunit;

namespace POS.API.Tests.D08Inquiry;

/// <summary>
/// D08 inquiry collaboration: notes and attachments hang off an inquiry and are written under
/// INQ_UPDATE_INQUIRY. Seekable check: NoClaims user is 403 on note add but the unclaimed
/// InquirySource list is reachable (Gap-Char).
/// </summary>
public sealed class InquiryNotesTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public InquiryNotesTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_AddAndListNote_On_Inquiry()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var inquiryId = await NewInquiryAsync(client);

        var note = await client.PostAsJsonAsync("/api/InquiryNote", new
        {
            inquiryId,
            note = "Follow up with the client on pricelist."
        });
        Assert.True(note.IsSuccessStatusCode, await note.Content.ReadAsStringAsync());

        var list = await client.GetAsync($"/api/InquiryNote/{inquiryId}");
        Assert.True(list.IsSuccessStatusCode, await list.Content.ReadAsStringAsync());
        var body = await list.Content.ReadAsStringAsync();
        Assert.Contains("Follow up with the client on pricelist.", body);

        await _factory.UsingDbAsync(db =>
        {
            Assert.True(db.Set<InquiryNote>().Any(n => n.InquiryId == inquiryId && !n.IsDeleted));
            return Task.CompletedTask;
        });
    }

    [Fact]
    public async Task Should_AddAndDownload_Attachment_On_Inquiry()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var inquiryId = await NewInquiryAsync(client);

        var add = await client.PostAsJsonAsync("/api/InquiryAttachment", new
        {
            inquiryId,
            name = "quote.pdf",
            documents = "data:application/pdf;base64,JVBERi0xLjQK",
            extension = ".pdf"
        });
        Assert.True(add.IsSuccessStatusCode, await add.Content.ReadAsStringAsync());
        var attachmentId = (await add.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>())
            .GetProperty("id").GetGuid();

        var download = await client.GetAsync($"/api/InquiryAttachment/{attachmentId}/download");
        Assert.True(download.IsSuccessStatusCode, await download.Content.ReadAsStringAsync());
        Assert.Equal("application/pdf", download.Content.Headers.ContentType?.MediaType);

        var list = await client.GetAsync($"/api/InquiryAttachment/{inquiryId}");
        Assert.True(list.IsSuccessStatusCode, await list.Content.ReadAsStringAsync());
        Assert.Contains("quote.pdf", await list.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Should_Return403_When_AddingNoteWithoutUpdateClaim()
    {
        await _factory.EnsureSeededAsync();
        var noClaims = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var inquiryId = await NewInquiryAsync(client);

        var response = await noClaims.PostAsJsonAsync("/api/InquiryNote", new { inquiryId, note = "lease probe" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Should_UpdateInquiry_Source_When_Claimed_And_ListWithoutClaim_GapCharacterization()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var noClaims = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var add = await client.PostAsJsonAsync("/api/InquirySource", new { name = $"Web-{Guid.NewGuid():N}"[..14] });
        Assert.True(add.IsSuccessStatusCode, await add.Content.ReadAsStringAsync());
        var sourceId = (await add.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>()).GetProperty("id").GetGuid();

        var update = await client.PutAsJsonAsync($"/api/InquirySource/{sourceId}", new { name = "Renamed source" });
        Assert.True(update.IsSuccessStatusCode, await update.Content.ReadAsStringAsync());

        var noClaimList = await noClaims.GetAsync("/api/InquirySources");
        Assert.True(noClaimList.IsSuccessStatusCode, await noClaimList.Content.ReadAsStringAsync());
        Assert.Contains("Renamed source", await noClaimList.Content.ReadAsStringAsync());
    }

    private static async Task<Guid> NewInquiryAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/Inquiry", new
        {
            companyName = $"Acme-{Guid.NewGuid():N}"[..18],
            contactPerson = "CRM Contact",
            email = $"crm-{Guid.NewGuid():N}"[..26] + "@test.local",
            mobileNo = "0300-0000666",
            message = "Please quote for our next order.",
            inquirySourceId = TestIds.InquirySourceWebId,
            inquiryStatusId = TestIds.InquiryStatusOpenId
        });
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        return (await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>()).GetProperty("id").GetGuid();
    }
}