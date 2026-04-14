using Microsoft.EntityFrameworkCore;
using System;

namespace ApiAndQueriesProfiler
{
    public class ProfilerDbContext : DbContext
    {
        private readonly ProfilerOptions _options;

        public ProfilerDbContext(DbContextOptions<ProfilerDbContext> options, ProfilerOptions profilerOptions) : base(options)
        {
            _options = profilerOptions;
        }

        public DbSet<ApiRequestLog> ApiRequestLogs { get; set; }
        public DbSet<EfQueryLog> EfQueryLogs { get; set; }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            if (!optionsBuilder.IsConfigured)
            {
                if (string.Equals(_options.DatabaseProvider, "PostgreSQL", StringComparison.OrdinalIgnoreCase))
                {
                    optionsBuilder.UseNpgsql(_options.ConnectionString);
                }
                else if (string.Equals(_options.DatabaseProvider, "Sqlite", StringComparison.OrdinalIgnoreCase))
                {
                    optionsBuilder.UseSqlite(_options.ConnectionString);
                }
                else
                {
                    optionsBuilder.UseSqlServer(_options.ConnectionString);
                }
            }
        }
    }
}