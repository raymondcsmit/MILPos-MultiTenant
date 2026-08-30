using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.API.Tests.Infra;
using POS.Data;
using Xunit;

namespace POS.API.Tests.D09Email;

/// <summary>
/// D09 email surface: SMTP settings + templates are claim-gated CRUD, logs list under
/// LOGS_VIEW_EMAIL_LOGS, and the send route is gated (contrast: ImportExport has no gates at all).
/// Sending is not integration-testable (real SMTP client), so the send route is only gate-tested.
/// </summary>
public sealed class EmailTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public EmailTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_AddSmtpSetting_When_Claimed()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var response = await client.PostAsJsonAsync("/api/EmailSMTPSetting", new
        {
            host = "smtp.test.local",
            userName = "notifications",
            password = "secret",
            port = 587,
            isDefault = true,
            encryptionType = "STARTTLS",
            fromEmail = "no-reply@test.local",
            fromName = "MILPOS"
        });
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(db =>
        {
            Assert.True(db.Set<EmailSMTPSetting>().Any(s => s.Host == "smtp.test.local" && !s.IsDeleted));
            return Task.CompletedTask;
        });
    }

    [Fact]
    public async Task Should_UpdateAndGetEmailTemplate_When_Claimed()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var add = await client.PostAsJsonAsync("/api/EmailTemplate", new { name = "Welcome", subject = "Welcome to MILPOS", body = "<p>Hi</p>" });
        Assert.True(add.IsSuccessStatusCode, await add.Content.ReadAsStringAsync());
        var id = (await add.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>()).GetProperty("id").GetGuid();

        var update = await client.PutAsJsonAsync($"/api/EmailTemplate/{id}", new { name = "Welcome", subject = "Welcome!", body = "<p>Hi there</p>" });
        Assert.True(update.IsSuccessStatusCode, await update.Content.ReadAsStringAsync());

        var list = await client.GetAsync("/api/EmailTemplate");
        Assert.True(list.IsSuccessStatusCode, await list.Content.ReadAsStringAsync());
        Assert.Contains("Welcome!", await list.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Should_ListEmailLogs_When_Claimed()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var response = await client.GetAsync("/api/EmailLog");

        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Should_Return403_When_ManagingEmailWithoutClaim()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync("/api/EmailSMTPSetting", new { host = "x" })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync("/api/EmailTemplate", new { name = "x" })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync("/api/Email", new { to = "t@t.local" })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/EmailLog")).StatusCode);
    }
}