namespace ApiAndQueriesProfiler
{
    public class ProfilerOptions
    {
        public string DatabaseProvider { get; set; } = "Sqlite"; // Sqlite, SqlServer, PostgreSQL
        public string ConnectionString { get; set; }
    }
}