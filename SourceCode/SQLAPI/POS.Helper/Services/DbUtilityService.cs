using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.Common.Services;
using POS.Common;

namespace POS.Helper.Services
{
    public class DbUtilityService : IDbUtilityService
    {
        public async Task DisableForeignKeyCheckAsync(DbContext context)
        {
            var provider = context.Database.ProviderName;
            if (provider == AppConstants.DatabaseProviders.Sqlite)
            {
                await context.Database.ExecuteSqlRawAsync("PRAGMA foreign_keys = OFF;");
            }
            else if (provider == AppConstants.DatabaseProviders.SqlServer)
            {
                await context.Database.ExecuteSqlRawAsync("EXEC sp_msforeachtable \"ALTER TABLE ? NOCHECK CONSTRAINT all\"");
            }
            else if (provider.Contains(AppConstants.DatabaseProviders.PostgreSql, StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    await context.Database.ExecuteSqlRawAsync("SET session_replication_role = 'replica';");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Warning: Could not set session_replication_role to 'replica'. Error: {ex.Message}");
                }
            }
        }

        public async Task EnableForeignKeyCheckAsync(DbContext context)
        {
            var provider = context.Database.ProviderName;
            if (provider == AppConstants.DatabaseProviders.Sqlite)
            {
                await context.Database.ExecuteSqlRawAsync("PRAGMA foreign_keys = ON;");
            }
            else if (provider == AppConstants.DatabaseProviders.SqlServer)
            {
                await context.Database.ExecuteSqlRawAsync("EXEC sp_msforeachtable \"ALTER TABLE ? WITH CHECK CHECK CONSTRAINT all\"");
            }
            else if (provider.Contains(AppConstants.DatabaseProviders.PostgreSql, StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    await context.Database.ExecuteSqlRawAsync("SET session_replication_role = 'origin';");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Warning: Could not set session_replication_role to 'origin'. Error: {ex.Message}");
                }
            }
        }

        public async Task EnsureMigrationHistoryAsync(DbContext context)
        {
            var provider = context.Database.ProviderName;
            if (provider == AppConstants.DatabaseProviders.Sqlite)
            {
                var historySql = @"
                    CREATE TABLE IF NOT EXISTS ""__EFMigrationsHistory"" (
                        ""MigrationId"" TEXT NOT NULL CONSTRAINT ""PK___EFMigrationsHistory"" PRIMARY KEY,
                        ""ProductVersion"" TEXT NOT NULL
                    );
                    INSERT INTO ""__EFMigrationsHistory"" (""MigrationId"", ""ProductVersion"")
                    VALUES ('20260213024351_MainInitSqlite', '10.0.2');
                ";
                await context.Database.ExecuteSqlRawAsync(historySql);
            }
            // For other providers, we assume migrations are correctly handled by standard mechanisms
        }
    }
}
