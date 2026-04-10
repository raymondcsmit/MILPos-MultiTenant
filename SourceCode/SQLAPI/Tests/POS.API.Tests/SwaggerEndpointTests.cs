using System.Threading.Tasks;
using System.Net;
using Xunit;

namespace POS.API.Tests;

public sealed class SwaggerEndpointTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public SwaggerEndpointTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task SwaggerJson_ReturnsOk()
    {
        using var client = _factory.CreateClient();
        using var response = await client.GetAsync("/swagger/v1/swagger.json");
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.StatusCode == HttpStatusCode.OK, $"Expected 200 OK but got {(int)response.StatusCode} {response.StatusCode}. Body: {body}");
    }
}
