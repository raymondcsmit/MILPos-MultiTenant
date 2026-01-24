using Microsoft.Extensions.Configuration;
using POS.DataMigrationUtility;
using System;
using System.IO;
using System.Threading.Tasks;

namespace POS.DataMigrationUtility
{
    class Program
    {
        static async Task Main(string[] args)
        {
            Console.WriteLine("POS Data Migration Utility");
            Console.WriteLine("==========================");

            try
            {
                var configuration = BuildConfiguration();
                var migrationService = new DataMigrationService(configuration);

                Console.WriteLine("This utility will migrate data from SQL Server to SQLite.");
                Console.WriteLine("Make sure both databases are accessible before proceeding.");
                Console.WriteLine();

                Console.Write("Do you want to continue? (y/n): ");
                var response = Console.ReadLine()?.Trim().ToLower();

                if (response != "y" && response != "yes")
                {
                    Console.WriteLine("Migration cancelled by user.");
                    return;
                }

                Console.WriteLine();
                await migrationService.MigrateDataAsync();

                Console.WriteLine();
                Console.WriteLine("Migration completed successfully!");

                // Auto-copy to POS.API folder to ensure they are in sync
                try 
                {
                    var sourceDb = "POSDb.db";
                    var targetDb = Path.Combine(Directory.GetParent(Directory.GetCurrentDirectory()).Parent.Parent.FullName, "POS.API", "POSDb.db");
                    
                    // Adjust path if running from bin/Debug/net10.0
                    if (!Directory.Exists(Path.GetDirectoryName(targetDb)))
                    {
                         // Try hardcoded path based on user input context if relative fail
                         targetDb = @"f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.API\POSDb.db";
                    }

                    if (File.Exists(sourceDb) && Directory.Exists(Path.GetDirectoryName(targetDb)))
                    {
                        Console.WriteLine($"Copying {sourceDb} to {targetDb}...");
                        File.Copy(sourceDb, targetDb, true);
                        Console.WriteLine("Database synced to API project.");
                    }
                    else
                    {
                        Console.WriteLine($"Could not auto-copy database. Source exists: {File.Exists(sourceDb)}, Target Dir exists: {Directory.Exists(Path.GetDirectoryName(targetDb))}");
                        Console.WriteLine($"Target Path: {targetDb}");
                    }
                }
                catch (Exception copyEx)
                {
                    Console.WriteLine($"Warning: Failed to copy database to API project: {copyEx.Message}");
                }

                Console.WriteLine("Press any key to exit...");
                Console.ReadKey();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"An error occurred during migration: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner exception: {ex.InnerException.Message}");
                }

                Console.WriteLine();
                Console.WriteLine("Migration failed. Press any key to exit...");
                Console.ReadKey();
            }
        }

        static IConfiguration BuildConfiguration()
        {
            var builder = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
                .AddEnvironmentVariables();

            return builder.Build();
        }
    }
}