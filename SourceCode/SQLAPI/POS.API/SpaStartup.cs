using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace POS.API
{
    internal class SpaStartup
    {
        internal static void Configure(IApplicationBuilder app)
        {
            // Map the SPA to /app path
            app.Map("/app", spaApp =>
            {
                spaApp.UseSpaStaticFiles();
                spaApp.UseSpa(spa =>
                {
                    spa.Options.SourcePath = "ClientApp";
                });
            });
        }

        internal static void ConfigureServices(IServiceCollection services)
        {
            var spaPath = ((IConfiguration)services.BuildServiceProvider().GetService(typeof(IConfiguration))).GetValue<string>("SpaRootPath");
            services.AddSpaStaticFiles(configuration =>
            {
                // Default to ClientApp to avoid conflict with MVC wwwroot
                configuration.RootPath = !string.IsNullOrEmpty(spaPath) ? spaPath : "ClientApp";
            });
        }
    }
}
