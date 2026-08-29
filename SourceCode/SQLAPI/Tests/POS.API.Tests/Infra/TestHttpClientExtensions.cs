using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using POS.Data.Dto;

namespace POS.API.Tests.Infra;

public static class TestHttpClientExtensions
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    /// <summary>
    /// Adds CF-Connecting-IP because AuthenticationController.Login derives RemoteIp from that header
    /// (falling back to Connection.RemoteIpAddress, which is null for in-memory test servers).
    /// </summary>
    internal static HttpClient AddForwardedIpHeader(this HttpClient client)
    {
        client.DefaultRequestHeaders.Add("CF-Connecting-IP", "127.0.0.1");
        return client;
    }

    /// <summary>
    /// Logs in through the real endpoint (POST /api/authentication) and returns the bearer token.
    /// </summary>
    public static async Task<string> GetTokenAsync(
        this TestWebApplicationFactory factory,
        string userName,
        string password)
    {
        var client = factory.CreateClient().AddForwardedIpHeader();
        var response = await client.PostAsJsonAsync("/api/authentication", new { userName, password });
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Login failed for '{userName}': {(int)response.StatusCode} {body}");
        }

        var dto = JsonSerializer.Deserialize<UserAuthDto>(body, JsonOptions)
                  ?? throw new InvalidOperationException("Login response could not be parsed as UserAuthDto.");
        return dto.BearerToken;
    }

    /// <summary>
    /// Creates an HttpClient with the Authorization header pre-set from a real login.
    /// </summary>
    public static async Task<HttpClient> CreateAuthorizedClientAsync(
        this TestWebApplicationFactory factory,
        string userName,
        string password)
    {
        var token = await factory.GetTokenAsync(userName, password);
        return factory.CreateAuthorizedClientWithToken(token);
    }

    public static HttpClient CreateAuthorizedClientWithToken(this TestWebApplicationFactory factory, string token)
    {
        var client = factory.CreateClient().AddForwardedIpHeader();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }
}
