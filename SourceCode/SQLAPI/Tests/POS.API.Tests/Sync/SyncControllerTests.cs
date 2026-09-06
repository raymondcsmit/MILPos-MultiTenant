using System;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using POS.API.Tests.Infra;
using POS.Data.Entities;
using POS.Domain;
using POS.Domain.Sync;
using Xunit;

namespace POS.API.Tests.Sync;

/// <summary>
/// Verifies security hardening and telemetry retrieval on SyncController (BUG-08 / N-01 & BUG-09 / N-06).
/// Unauthenticated callers are rejected with 401, authenticated clients receive live telemetry,
/// and SyncEngine push passes advance LastPushSync timestamp.
/// </summary>
public sealed class SyncControllerTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public SyncControllerTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_Return401_When_SyncNowTriggeredUnauthenticated_GapTargetFixed()
    {
        await _factory.EnsureSeededAsync();
        var client = _factory.CreateClient();

        var response = await client.PostAsync("/api/sync/now?direction=pull", null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Should_Return401_When_GetSyncStatusUnauthenticated_GapTargetFixed()
    {
        await _factory.EnsureSeededAsync();
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/sync/status");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Should_Return200AndLiveTelemetry_When_AuthorizedUserRequestsSyncStatus_GapTargetFixed()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var response = await client.GetAsync("/api/sync/status");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.TryGetProperty("syncEnabled", out var syncEnabledProp), "Response missing 'syncEnabled' property");
        Assert.True(syncEnabledProp.GetBoolean());
        Assert.True(json.TryGetProperty("status", out var statusProp), "Response missing 'status' property");
        Assert.NotNull(statusProp.GetString());
        Assert.True(json.TryGetProperty("recordsSynced", out _), "Response missing 'recordsSynced' property");
        Assert.True(json.TryGetProperty("recordsConflicted", out _), "Response missing 'recordsConflicted' property");
        Assert.True(json.TryGetProperty("recordsFailed", out _), "Response missing 'recordsFailed' property");
    }

    [Fact]
    public async Task Should_ReturnSyncEnabledFalse_When_DisabledInConfiguration()
    {
        await _factory.EnsureSeededAsync();
        var token = await _factory.GetTokenAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var disabledFactory = _factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("SyncSettings:Enabled", "false");
        });

        var client = disabledFactory.CreateClient().AddForwardedIpHeader();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        var response = await client.GetAsync("/api/sync/status");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.TryGetProperty("syncEnabled", out var syncEnabledProp), "Response missing 'syncEnabled' property");
        Assert.False(syncEnabledProp.GetBoolean());
    }

    [Fact]
    public async Task Should_RejectSync_When_SyncEnabledIsFalseInConfiguration()
    {
        await _factory.EnsureSeededAsync();
        var token = await _factory.GetTokenAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var disabledFactory = _factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("SyncSettings:Enabled", "false");
        });

        var client = disabledFactory.CreateClient().AddForwardedIpHeader();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        var response = await client.PostAsync("/api/sync/now?direction=push", null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.TryGetProperty("status", out var statusProp));
        Assert.Equal("Disabled", statusProp.GetString());
        Assert.True(json.TryGetProperty("errorMessage", out var errorProp));
        Assert.Contains("Synchronization is disabled in appsettings configuration", errorProp.GetString());
    }

    [Fact]
    public async Task Should_AdvanceLastPushSync_When_SyncEnginePushesChanges_GapTargetFixed()
    {
        await _factory.EnsureSeededAsync();

        using var scope = _factory.Services.CreateScope();
        var syncEngine = scope.ServiceProvider.GetRequiredService<SyncEngine>();
        var dbContext = scope.ServiceProvider.GetRequiredService<POSDbContext>();

        var beforeTime = DateTime.UtcNow.AddSeconds(-2);
        var result = await syncEngine.SynchronizeAsync(new SyncOptions
        {
            Direction = SyncDirection.Push
        });

        Assert.Equal(SyncLogStatus.Completed, result.Status);

        var metadata = await dbContext.SyncMetadata.FirstOrDefaultAsync(m => m.EntityType == "All");
        Assert.NotNull(metadata);
        Assert.True(metadata.LastPushSync >= beforeTime,
            $"Expected LastPushSync to advance past {beforeTime}, but was {metadata.LastPushSync}");
    }
}
