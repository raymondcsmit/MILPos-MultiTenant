using Microsoft.EntityFrameworkCore.Migrations;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.RegularExpressions;

#nullable disable

namespace POS.Domain.Migrations
{
    /// <inheritdoc />
    public partial class Version_V1_Data : Migration
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
            else
            {
                var assembly = Assembly.GetExecutingAssembly();
                var type = GetType();
                // Match the SQLite file pattern in the Sqlite subfolder: Namespace.Sqlite.Timestamp_Name_Sqlite.sql
                // Or just look for the file ending with _Sqlite.sql that matches the migration name logic
                // The file I created is: POS.Domain.Migrations.Sqlite.20251002094214_Version_V1_Data_Sqlite.sql
                
                var resourceName = assembly.GetManifestResourceNames()
                    .FirstOrDefault(x => x.EndsWith("20251002094214_Version_V1_Data_Sqlite.sql"));
                    
                if (resourceName != null)
                {
                    using var stream = assembly.GetManifestResourceStream(resourceName);
                    using var reader = new StreamReader(stream);
                    var sqlResult = reader.ReadToEnd();
                    migrationBuilder.Sql(sqlResult);
                }
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}

