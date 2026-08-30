using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using POS.API.Tests.Infra;
using Xunit;

namespace POS.API.Tests.D08Notice;

/// <summary>
/// D08 notification center + reminder scheduling: the notification lists/mark-all-read
/// and the reminder-scheduler create+lookup are [Authorize]-only (any authenticated user
/// reaches them — Gap-Char); scheduler aggregates remain claimed-side only (no claim models here).
/// </summary>
public sealed class NotificationSchedulerTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public NotificationSchedulerTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_ServeNotifications_Without_Claim_GapCharacterization()
    {
        await _factory.EnsureSeededAsync();
        var no = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        foreach (var route in new[] { "/api/Notification/top10", "/api/Notification/all", "/api/Notification/count" })
        {
            var response = await no.GetAsync(route);
            Assert.True(response.IsSuccessStatusCode, $"{route} -> {(int)response.StatusCode} {await response.Content.ReadAsStringAsync()}");
        }

        var marked = await no.PostAsync("/api/Notification/markAllAsRead", null);
        Assert.True(marked.IsSuccessStatusCode, $"markAllAsRead -> {(int)marked.StatusCode} {await marked.Content.ReadAsStringAsync()}");
    }

    [Fact]
    public async Task Should_ServeReminderScheduler_Without_Claim_GapCharacterization()
    {
        await _factory.EnsureSeededAsync();
        var no = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var scheduled = await no.PostAsJsonAsync("/api/ReminderScheduler", new
        {
            application = 1,
            referenceId = Guid.Empty,
            createdDate = DateTime.UtcNow,
            userIds = new object[] { TestIds.NoClaimsUserId },
            isEmailNotification = false,
            subject = "diag",
            message = "msg"
        });
        Assert.True(scheduled.IsSuccessStatusCode, $"scheduler create -> {(int)scheduled.StatusCode} {await scheduled.Content.ReadAsStringAsync()}");

        var lookup = await no.GetAsync("/api/ReminderScheduler/Reminder/aaaaaaaa-0000-0000-0000-000000000001");
        Assert.True(lookup.IsSuccessStatusCode, $"scheduler lookup -> {(int)lookup.StatusCode} {await lookup.Content.ReadAsStringAsync()}");
    }
}