using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using System;

namespace ApiAndQueriesProfiler
{
    public static class ProfilerExtensions
    {
        public static IServiceCollection AddApiAndQueriesProfiler(this IServiceCollection services, Action<ProfilerOptions> configureOptions)
        {
            var options = new ProfilerOptions();
            configureOptions(options);

            services.AddSingleton(options);
            services.AddSingleton<ProfilerLogChannel>();
            services.AddSingleton<ProfilerCommandInterceptor>();

            // Register the DbContext for the Profiler
            services.AddDbContext<ProfilerDbContext>(dbOptions => {
                if (string.Equals(options.DatabaseProvider, "PostgreSQL", StringComparison.OrdinalIgnoreCase))
                {
                    dbOptions.UseNpgsql(options.ConnectionString);
                }
                else if (string.Equals(options.DatabaseProvider, "Sqlite", StringComparison.OrdinalIgnoreCase))
                {
                    dbOptions.UseSqlite(options.ConnectionString);
                }
                else
                {
                    dbOptions.UseSqlServer(options.ConnectionString);
                }
            });

            services.AddHostedService<ProfilerBackgroundService>();

            return services;
        }

        public static IApplicationBuilder UseApiAndQueriesProfiler(this IApplicationBuilder app)
        {
            return app.UseMiddleware<ProfilerMiddleware>();
        }
    }
}