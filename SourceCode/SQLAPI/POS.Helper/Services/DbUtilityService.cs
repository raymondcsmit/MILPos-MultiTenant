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

        public async Task EnsureLicensingSchemaAsync(DbContext context)
        {
            var provider = context.Database.ProviderName ?? string.Empty;
            var sql = GetEnsureLicensesTableSql(provider);
            if (string.IsNullOrWhiteSpace(sql))
            {
                return;
            }
            await context.Database.ExecuteSqlRawAsync(sql);
        }

        private static string GetEnsureLicensesTableSql(string provider)
        {
            if (string.Equals(provider, AppConstants.DatabaseProviders.Sqlite, StringComparison.OrdinalIgnoreCase))
            {
                return @"
CREATE TABLE IF NOT EXISTS ""Licenses"" (
    ""Id"" TEXT NOT NULL CONSTRAINT ""PK_Licenses"" PRIMARY KEY,
    ""TenantId"" TEXT NOT NULL,
    ""TokenId"" TEXT NOT NULL,
    ""TokenHash"" TEXT NOT NULL,
    ""Plan"" TEXT NOT NULL,
    ""Status"" TEXT NOT NULL,
    ""IssuedAt"" TEXT NOT NULL,
    ""ActivatedAt"" TEXT NULL,
    ""ExpiresAt"" TEXT NULL,
    ""MaxUsers"" INTEGER NULL,
    ""CreatedDate"" TEXT NOT NULL,
    ""CreatedBy"" TEXT NOT NULL,
    ""ModifiedDate"" TEXT NOT NULL,
    ""ModifiedBy"" TEXT NOT NULL,
    ""DeletedDate"" TEXT NULL,
    ""DeletedBy"" TEXT NULL,
    ""SyncVersion"" INTEGER NOT NULL DEFAULT 0,
    ""LastSyncedAt"" TEXT NULL,
    ""IsDeleted"" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ""IX_Licenses_TenantId_Status"" ON ""Licenses"" (""TenantId"", ""Status"");
CREATE INDEX IF NOT EXISTS ""IX_Licenses_TenantId_TokenId"" ON ""Licenses"" (""TenantId"", ""TokenId"");
";
            }

            if (provider.Contains(AppConstants.DatabaseProviders.PostgreSql, StringComparison.OrdinalIgnoreCase))
            {
                return @"
CREATE TABLE IF NOT EXISTS ""Licenses"" (
    ""Id"" uuid PRIMARY KEY,
    ""TenantId"" uuid NOT NULL,
    ""TokenId"" text NOT NULL,
    ""TokenHash"" text NOT NULL,
    ""Plan"" text NOT NULL,
    ""Status"" text NOT NULL,
    ""IssuedAt"" timestamptz NOT NULL,
    ""ActivatedAt"" timestamptz NULL,
    ""ExpiresAt"" timestamptz NULL,
    ""MaxUsers"" integer NULL,
    ""CreatedDate"" timestamptz NOT NULL,
    ""CreatedBy"" uuid NOT NULL,
    ""ModifiedDate"" timestamptz NOT NULL,
    ""ModifiedBy"" uuid NOT NULL,
    ""DeletedDate"" timestamptz NULL,
    ""DeletedBy"" uuid NULL,
    ""SyncVersion"" bigint NOT NULL DEFAULT 0,
    ""LastSyncedAt"" timestamptz NULL,
    ""IsDeleted"" boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS ""IX_Licenses_TenantId_Status"" ON ""Licenses"" (""TenantId"", ""Status"");
CREATE INDEX IF NOT EXISTS ""IX_Licenses_TenantId_TokenId"" ON ""Licenses"" (""TenantId"", ""TokenId"");
";
            }

            if (string.Equals(provider, AppConstants.DatabaseProviders.SqlServer, StringComparison.OrdinalIgnoreCase) ||
                provider.Contains("SqlServer", StringComparison.OrdinalIgnoreCase))
            {
                return @"
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Licenses]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Licenses] (
        [Id] uniqueidentifier NOT NULL CONSTRAINT [PK_Licenses] PRIMARY KEY,
        [TenantId] uniqueidentifier NOT NULL,
        [TokenId] nvarchar(100) NOT NULL,
        [TokenHash] nvarchar(200) NOT NULL,
        [Plan] nvarchar(100) NOT NULL,
        [Status] nvarchar(50) NOT NULL,
        [IssuedAt] datetime2 NOT NULL,
        [ActivatedAt] datetime2 NULL,
        [ExpiresAt] datetime2 NULL,
        [MaxUsers] int NULL,
        [CreatedDate] datetime2 NOT NULL,
        [CreatedBy] uniqueidentifier NOT NULL,
        [ModifiedDate] datetime2 NOT NULL,
        [ModifiedBy] uniqueidentifier NOT NULL,
        [DeletedDate] datetime2 NULL,
        [DeletedBy] uniqueidentifier NULL,
        [SyncVersion] bigint NOT NULL CONSTRAINT [DF_Licenses_SyncVersion] DEFAULT 0,
        [LastSyncedAt] datetime2 NULL,
        [IsDeleted] bit NOT NULL CONSTRAINT [DF_Licenses_IsDeleted] DEFAULT 0
    );
    CREATE INDEX [IX_Licenses_TenantId_Status] ON [dbo].[Licenses] ([TenantId], [Status]);
    CREATE INDEX [IX_Licenses_TenantId_TokenId] ON [dbo].[Licenses] ([TenantId], [TokenId]);
END
";
            }

            return string.Empty;
        }
    }
}
