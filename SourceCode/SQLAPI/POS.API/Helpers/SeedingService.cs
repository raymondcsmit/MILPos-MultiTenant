using Microsoft.EntityFrameworkCore;
using POS.Domain;
using System;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace POS.API.Helpers
{
    public class SeedingService
    {
        private readonly POSDbContext _context;

        public SeedingService(POSDbContext context)
        {
            _context = context;
        }

        public async Task SeedAsync()
        {
            try
            {
                // Check if the database is already seeded
                if (await _context.Users.AnyAsync())
                {
                    Console.WriteLine("Database already seeded. Skipping data initialization.");
                    return;
                }

                Console.WriteLine("Starting database seeding...");

                // NOTE: This seeding service is obsolete with the new migration approach
                // Seed data is now handled directly in migrations
                // Keeping this method for backward compatibility but it won't execute
                Console.WriteLine("Seeding is now handled by EF Core migrations. Run 'dotnet ef database update' to seed data.");
                return;

                /*
                var assembly = typeof(POS.Domain.Migrations.Initial_Data).Assembly;
                // Resource name might vary, checking for the specific file
                var resourceName = assembly.GetManifestResourceNames()
                    .FirstOrDefault(x => x.EndsWith("20250223073432_Initial_Data.sql"));

                if (resourceName == null)
                {
                    Console.WriteLine("Error: Seeding script '20250223073432_Initial_Data.sql' not found in resources.");
                    return;
                }
                */

                /*
                // Split by GO statements
                // Regex to split by GO on a separate line, case insensitive
                var commands = Regex.Split(sqlContent, @"^\s*GO\s*$", RegexOptions.Multiline | RegexOptions.IgnoreCase);

                using (var transaction = await _context.Database.BeginTransactionAsync())
                {
                    try
                    {
                        foreach (var command in commands)
                        {
                            if (string.IsNullOrWhiteSpace(command))
                                continue;

                            var processedCommand = command;

                            // If SQLite, apply transformations
                            if (_context.Database.IsSqlite())
                            {
                                // Skip Stored Procedures
                                if (processedCommand.Contains("CREATE PROCEDURE", StringComparison.OrdinalIgnoreCase))
                                {
                                    continue;
                                }

                                // Remove [dbo]. prefix
                                processedCommand = processedCommand.Replace("[dbo].", "");

                                // Remove SET QUOTED_IDENTIFIER
                                processedCommand = Regex.Replace(processedCommand, @"SET QUOTED_IDENTIFIER (ON|OFF)", "", RegexOptions.IgnoreCase);

                                // Fix DateTime2 CASTs: CAST(N'2021-...' AS DateTime2) -> '2021-...'
                                processedCommand = Regex.Replace(processedCommand, @"CAST\(N'([^']+)' AS DateTime2\)", "'$1'");

                                // Fix Decimal CASTs: CAST(10.00 AS Decimal(18, 2)) -> 10.00
                                processedCommand = Regex.Replace(processedCommand, @"CAST\(([\d\.]+) AS Decimal\(\d+,\s*\d+\)\)", "$1");
                                
                                // Replace N'string' with 'string' for SQLite compatibility if needed
                                // Although SQLite usually handles N'', standardizing helps. 
                                // We'll rely on the CAST fix above for the main issue.
                            }

                            if (!string.IsNullOrWhiteSpace(processedCommand))
                            {
                                await _context.Database.ExecuteSqlRawAsync(processedCommand);
                            }
                        }

                        await transaction.CommitAsync();
                        Console.WriteLine("Database seeding completed successfully.");
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error during seeding execution: {ex.Message}");
                        await transaction.RollbackAsync();
                        throw;
                    }
                }
                */
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Seeding Service Failed: {ex.Message}");
                throw;
            }
        }
    }
}
