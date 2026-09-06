using System;
using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using POS.API.Tests.Infra;
using Xunit;

namespace POS.API.Tests.D09SysAdmin;

/// <summary>
/// Verifies that updating a non-existent role returns HTTP 404 Not Found instead of
/// throwing a NullReferenceException and crashing with HTTP 500 (BUG-15 / N-08).
/// </summary>
public sealed class RoleUpdateUnknownIdTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public RoleUpdateUnknownIdTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_Return404_When_UpdatingNonExistentRole_GapTargetFixed()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var unknownRoleId = Guid.NewGuid();
        var payload = new
        {
            id = unknownRoleId,
            name = $"NonExistentRole-{Guid.NewGuid():N}"[..20],
            roleClaims = Array.Empty<object>()
        };

        var response = await client.PutAsJsonAsync($"/api/Role/{unknownRoleId}", payload);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
