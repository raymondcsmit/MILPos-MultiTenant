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
            var config = app.ApplicationServices.GetService<IConfiguration>();
            var spaPath = config.GetValue<string>("SpaRootPath");
            var sourcePath = !string.IsNullOrEmpty(spaPath) ? spaPath : "ClientApp";

            // Map the SPA to /app path
            app.Map("/app", spaApp =>
            {
                spaApp.UseSpaStaticFiles();
                spaApp.UseSpa(spa =>
                {
                    spa.Options.SourcePath = sourcePath;
                });
            });
        }

        internal static void ConfigureServices(IServiceCollection services, IConfiguration configuration)
        {
            var spaPath = configuration.GetValue<string>("SpaRootPath");
            services.AddSpaStaticFiles(config =>
            {
                // Default to ClientApp to avoid conflict with MVC wwwroot
                config.RootPath = !string.IsNullOrEmpty(spaPath) ? spaPath : "ClientApp";
            });
        }
    }
}
