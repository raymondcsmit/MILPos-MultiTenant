using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace POS.Domain.Migrations
{
    /// <inheritdoc />
    public partial class Initial_Data : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            if (migrationBuilder.ActiveProvider == "Microsoft.EntityFrameworkCore.SqlServer")
            {
                var assembly = Assembly.GetExecutingAssembly();
                var type = GetType();
                var regex = new Regex($@"{Regex.Escape(type.Namespace)}\.\d{{14}}_{Regex.Escape(type.Name)}\.sql");

                var resourceName = assembly.GetManifestResourceNames().FirstOrDefault(x => regex.IsMatch(x));
                using var stream = assembly.GetManifestResourceStream(resourceName);
                using var reader = new StreamReader(stream);
                var sqlResult = reader.ReadToEnd();
                migrationBuilder.Sql(sqlResult);
            }
            /*
            else
            {
                var assembly = Assembly.GetExecutingAssembly();
                // Match the SQLite file pattern: Namespace.Timestamp_Name_Sqlite.sql
                // The file is 20250223073432_Initial_Data_Sqlite.sql in POS.Domain.Migrations
                
                var resourceName = assembly.GetManifestResourceNames()
                    .FirstOrDefault(x => x.EndsWith("20250223073432_Initial_Data_Sqlite.sql"));
                    
                if (resourceName != null)
                {
                    using var stream = assembly.GetManifestResourceStream(resourceName);
                    using var reader = new StreamReader(stream);
                    var sqlResult = reader.ReadToEnd();
                    migrationBuilder.Sql(sqlResult);
                }
            }
            */
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}

