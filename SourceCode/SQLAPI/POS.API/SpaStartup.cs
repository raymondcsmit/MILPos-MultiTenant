using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.StaticFiles;
using System.IO;
using Microsoft.Extensions.FileProviders;
using Microsoft.AspNetCore.Hosting;

namespace POS.API
{
    internal class SpaStartup
    {
        internal static void Configure(IApplicationBuilder app)
        {
            var config = app.ApplicationServices.GetService<IConfiguration>();
            var env = app.ApplicationServices.GetService<IWebHostEnvironment>();
            var spaPath = config.GetValue<string>("SpaRootPath");
            var sourcePath = !string.IsNullOrEmpty(spaPath) ? spaPath : "wwwroot";

            //var sourcePath = !string.IsNullOrEmpty(spaPath) ? spaPath : "ClientApp";

            // Serve static files from the SPA root path with the "/app" prefix
            // This is required because the Angular app has base href="/app/"
            var physicalPath = Path.Combine(env.ContentRootPath, sourcePath);
            if (Directory.Exists(physicalPath))
            {
                app.UseStaticFiles(new StaticFileOptions
                {
                    FileProvider = new PhysicalFileProvider(physicalPath),
                    RequestPath = "/app",
                    OnPrepareResponse = ctx =>
                    {
                         ctx.Context.Response.Headers.Append("Cache-Control", "public,max-age=31536000");
                    }
                });
            }

            // Serve SPA for any unhandled requests (e.g. /login, /dashboard)
            app.UseSpaStaticFiles();
            app.UseSpa(spa =>
            {
                spa.Options.SourcePath = sourcePath;
                spa.Options.DefaultPageStaticFileOptions = new StaticFileOptions
                {
                    OnPrepareResponse = ctx =>
                    {
                        ctx.Context.Response.Headers.Append("Cache-Control", "no-cache, no-store");
                        ctx.Context.Response.Headers.Append("Pragma", "no-cache");
                        ctx.Context.Response.Headers.Append("Expires", "0");
                    }
                };
            });
        }

        internal static void ConfigureServices(IServiceCollection services, IConfiguration configuration)
        {
            var spaPath = configuration.GetValue<string>("SpaRootPath");
            services.AddSpaStaticFiles(config =>
            {
                // Default to wwwroot to match deployment structure
                config.RootPath = !string.IsNullOrEmpty(spaPath) ? spaPath : "wwwroot";
            });
        }
    }
}
