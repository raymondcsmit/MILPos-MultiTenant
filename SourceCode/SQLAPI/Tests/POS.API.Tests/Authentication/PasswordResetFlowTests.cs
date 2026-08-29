using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.API.Tests.Infra;
using POS.Data;
using Xunit;

namespace POS.API.Tests.Authentication;

/// <summary>
/// WF-1.2 password reset: token lookup, recovery, and the SEC-04 gaps (token never validated,
/// unknown-user NRE). The forgotpassword email leg requires live SMTP — only its pre-email
/// validation paths are exercised here.
/// </summary>
public sealed class PasswordResetFlowTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public PasswordResetFlowTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_ReturnUserInfo_When_ResetCodeIsValid()
    {
        await _factory.EnsureSeededAsync();
        var client = _factory.CreateClient().AddForwardedIpHeader();
        var token = await SeedResetCodeAsync(TestSeed.AdminEmail);

        var response = await client.GetAsync($"/api/resetpassword/{token}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains(TestSeed.AdminEmail, body);
    }

    [Fact]
    public async Task Should_Return404_When_ResetCodeIsUnknown()
    {
        await _factory.EnsureSeededAsync();
        var client = _factory.CreateClient().AddForwardedIpHeader();

        var response = await client.GetAsync($"/api/resetpassword/{Guid.NewGuid():N}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Should_ResetPassword_When_TokenAndUserNameMatch()
    {
        await _factory.EnsureSeededAsync();
        var client = _factory.CreateClient().AddForwardedIpHeader();
        var token = await SeedResetCodeAsync(TestSeed.AdminEmail);

        var response = await client.PostAsJsonAsync($"/api/recoverpassword/{token}", new
        {
            userName = TestSeed.AdminEmail,
            password = "newSecret@123"
        });

        Assert.True(response.IsSuccessStatusCode, $"{(int)response.StatusCode} {await response.Content.ReadAsStringAsync()}");

        // Old password rejected, new password accepted, code cleared.
        var oldLogin = await client.PostAsJsonAsync("/api/authentication", new
        {
            userName = TestSeed.AdminEmail,
            password = TestSeed.AdminPassword
        });
        Assert.Equal(HttpStatusCode.Unauthorized, oldLogin.StatusCode);

        var newLogin = await client.PostAsJsonAsync("/api/authentication", new
        {
            userName = TestSeed.AdminEmail,
            password = "newSecret@123"
        });
        Assert.Equal(HttpStatusCode.OK, newLogin.StatusCode);

        var codeAfter = await _factory.UsingDbAsync(db => db.Users.IgnoreQueryFilters()
            .Where(u => u.Email == TestSeed.AdminEmail)
            .Select(u => u.ResetPasswordCode)
            .SingleAsync());
        Assert.Null(codeAfter);
    }

    // FLIPPED [SEC-04 / N-19]: the former Gap-Char tests
    // Should_ResetPasswordEvenWithWrongToken_When_UserNameIsKnown and
    // Should_Return500_When_RecoveringUnknownUser characterized the never-validated token and the
    // null-deref 500. Both production handlers were fixed and the behavior is now specified by the
    // Gap-Target tests below.

    [Fact]
    public async Task Should_Return404_When_RecoveringWithWrongToken()
    {
        // Gap-Target [SEC-04 / N-19]: the token must be validated — a wrong token on a known
        // user must 404 and must NOT change the password.
        await _factory.EnsureSeededAsync();
        var client = _factory.CreateClient().AddForwardedIpHeader();
        await SeedResetCodeAsync(TestSeed.AdminEmail);

        var response = await client.PostAsJsonAsync($"/api/recoverpassword/{Guid.NewGuid():N}", new
        {
            userName = TestSeed.AdminEmail,
            password = "bypassed@123"
        });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        // The password must be unchanged: the old one still logs in.
        var login = await client.PostAsJsonAsync("/api/authentication", new
        {
            userName = TestSeed.AdminEmail,
            password = TestSeed.AdminPassword
        });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
    }

    [Fact]
    public async Task Should_Return404_When_RecoveringUnknownUser()
    {
        // Gap-Target [SEC-04 / N-19]: unknown user must 404, not NRE → 500.
        await _factory.EnsureSeededAsync();
        var client = _factory.CreateClient().AddForwardedIpHeader();

        var response = await client.PostAsJsonAsync($"/api/recoverpassword/{Guid.NewGuid():N}", new
        {
            userName = "ghost@nowhere.local",
            password = "whatever@123"
        });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Should_Return404AndNotSetCode_When_ForgotPasswordForUnknownEmail()
    {
        await _factory.EnsureSeededAsync();
        var client = _factory.CreateClient().AddForwardedIpHeader();

        var response = await client.PostAsJsonAsync("/api/forgotpassword", new
        {
            email = "ghost@nowhere.local",
            userName = "ghost@nowhere.local",
            hostUrl = "http://localhost"
        });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Should_Return404SmtpMissing_When_ForgotPasswordForKnownEmailWithoutSmtp()
    {
        // The seeded environment has no SMTP settings: the handler must stop before sending email.
        await _factory.EnsureSeededAsync();
        var client = _factory.CreateClient().AddForwardedIpHeader();

        var response = await client.PostAsJsonAsync("/api/forgotpassword", new
        {
            email = TestSeed.AdminEmail,
            userName = TestSeed.AdminEmail,
            hostUrl = "http://localhost"
        });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("SMTP", body);

        var code = await _factory.UsingDbAsync(db => db.Users.IgnoreQueryFilters()
            .Where(u => u.Email == TestSeed.AdminEmail)
            .Select(u => u.ResetPasswordCode)
            .SingleAsync());
        Assert.Null(code);
    }

    private async Task<string> SeedResetCodeAsync(string email)
    {
        var token = Guid.NewGuid().ToString("N");
        await _factory.UsingDbAsync(async db =>
        {
            // AsTracking: the context defaults to NoTracking — an untracked entity would ignore the change.
            var user = await db.Users.IgnoreQueryFilters().AsTracking().SingleAsync(u => u.Email == email);
            user.ResetPasswordCode = token;
            await db.SaveChangesAsync();
        });
        return token;
    }
}

