using System;
using System.Collections.Generic;
using System.IO;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace POS.API.Tests;

public sealed class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration((_, configBuilder) =>
        {
            var dbPath = Path.Combine(Path.GetTempPath(), $"milpos_test_{Guid.NewGuid():N}.db");
            var settings = new Dictionary<string, string?>
            {
                ["DatabaseProvider"] = "Sqlite",
                ["ConnectionStrings:SqliteConnectionString"] = $"Data Source={dbPath}",
                ["ConnectionStrings:SqliteHangfirConnectionString"] = $"Data Source={dbPath}",
                ["SeedingConfig:Enabled"] = "false"
            };

            configBuilder.AddInMemoryCollection(settings);
        });
    }
}

