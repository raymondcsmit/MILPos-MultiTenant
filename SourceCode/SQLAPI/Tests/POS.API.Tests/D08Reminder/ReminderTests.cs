using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.API.Tests.Infra;
using POS.Data;
using POS.Data.Entities;
using Xunit;

namespace POS.API.Tests.D08Reminder;

/// <summary>
/// D08 reminders: Reminder create is UNCLAIMED (any authenticated user can create), while
/// update/delete require REM_UPDATE_REMINDER/REM_DELETE_REMINDER and the list requires
/// REM_VIEW_REMINDERS. The reminder auto-subscribes the posting user when no users are sent.
/// </summary>
public sealed class ReminderTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public ReminderTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_CreateReminder_Without_Claim_And_List_When_Claimed()
    {
        await _factory.EnsureSeededAsync();
        var noClaims = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);
        var admin = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var subject = $"Renew license {Guid.NewGuid():N}"[..26];
        var create = await noClaims.PostAsJsonAsync("/api/Reminder", new
        {
            subject,
            message = "Please renew before expiry",
            startDate = DateTime.UtcNow,
            isRepeated = false,
            isEmailNotification = false,
            reminderUsers = Array.Empty<object>(),
            dailyReminders = Array.Empty<object>(),
            quarterlyReminders = Array.Empty<object>(),
            halfYearlyReminders = Array.Empty<object>()
        });
        Assert.True(create.IsSuccessStatusCode, $"create1 -> {(int)create.StatusCode} {await create.Content.ReadAsStringAsync()}");

        await _factory.UsingDbAsync(db =>
        {
            var reminder = db.Set<Reminder>().AsNoTracking().Single(r => r.Subject == subject);
            Assert.True(db.Set<ReminderUser>().Any(u => u.ReminderId == reminder.Id &&
                                                        u.UserId == TestIds.NoClaimsUserId));
            return Task.CompletedTask;
        });

        var list = await admin.GetAsync("/api/Reminder/GetReminders");
        Assert.True(list.IsSuccessStatusCode, $"list -> {(int)list.StatusCode} {await list.Content.ReadAsStringAsync()}");
        Assert.Contains(subject, await list.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Should_Return403_When_UpdatingReminderWithoutClaim()
    {
        await _factory.EnsureSeededAsync();
        var noClaims = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var create = await noClaims.PostAsJsonAsync("/api/Reminder", new
        {
            subject = "Gate check",
            message = "probe",
            startDate = DateTime.UtcNow,
            isRepeated = false,
            isEmailNotification = false,
            reminderUsers = Array.Empty<object>(),
            dailyReminders = Array.Empty<object>(),
            quarterlyReminders = Array.Empty<object>(),
            halfYearlyReminders = Array.Empty<object>()
        });
        Assert.True(create.IsSuccessStatusCode, await create.Content.ReadAsStringAsync());
        var id = (await create.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>()).GetProperty("data").GetProperty("id").GetGuid();

        var response = await noClaims.PutAsJsonAsync($"/api/Reminder/{id}", new
        {
            subject = "updated no claim",
            message = "probe",
            startDate = DateTime.UtcNow,
            isRepeated = false,
            isEmailNotification = false,
            reminderUsers = Array.Empty<object>(),
            dailyReminders = Array.Empty<object>(),
            quarterlyReminders = Array.Empty<object>(),
            halfYearlyReminders = Array.Empty<object>()
        });

        Assert.True(response.StatusCode == HttpStatusCode.Forbidden,
            $"update as NoClaims -> {(int)response.StatusCode} {await response.Content.ReadAsStringAsync()}");
    }

    [Fact]
    public async Task Should_DeleteReminder_When_Claimed_And_BlockWithoutClaim()
    {
        await _factory.EnsureSeededAsync();
        var noClaims = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);
        var admin = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var create = await noClaims.PostAsJsonAsync("/api/Reminder", new
        {
            subject = "To delete",
            message = "gone soon",
            startDate = DateTime.UtcNow,
            isRepeated = false,
            isEmailNotification = false,
            reminderUsers = Array.Empty<object>(),
            dailyReminders = Array.Empty<object>(),
            quarterlyReminders = Array.Empty<object>(),
            halfYearlyReminders = Array.Empty<object>()
        });
        Assert.True(create.IsSuccessStatusCode, await create.Content.ReadAsStringAsync());
        var id = (await create.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>()).GetProperty("data").GetProperty("id").GetGuid();

        var noClaimsDelete = await noClaims.DeleteAsync($"/api/Reminder/{id}");
        Assert.True(noClaimsDelete.StatusCode == HttpStatusCode.Forbidden,
            $"delete as NoClaims -> {(int)noClaimsDelete.StatusCode} {await noClaimsDelete.Content.ReadAsStringAsync()}");

        var del = await admin.DeleteAsync($"/api/Reminder/{id}");
        Assert.True(del.IsSuccessStatusCode, $"delete as admin -> {(int)del.StatusCode} {await del.Content.ReadAsStringAsync()}");

await _factory.UsingDbAsync(db =>
        {
            var reminder = db.Set<Reminder>().IgnoreQueryFilters().AsNoTracking().Single(r => r.Id == id);
            Assert.True(reminder.IsDeleted);
            return Task.CompletedTask;
        });
    }

    [Fact]
    public async Task Should_CreateSchedulerEntry_Without_Claim_GapCharacterization()
    {
        await _factory.EnsureSeededAsync();
        var noClaims = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var response = await noClaims.PostAsJsonAsync("/api/ReminderScheduler", new
        {
            application = 0,
            referenceId = TestIds.InquiryStatusOpenId,
            createdDate = DateTime.UtcNow,
            userIds = new[] { TestIds.NoClaimsUserId },
            isEmailNotification = false,
            subject = "Scheduled follow up",
            message = "ping"
        });

        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
