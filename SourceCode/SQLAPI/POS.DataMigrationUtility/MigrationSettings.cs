namespace POS.DataMigrationUtility
{
    public class MigrationSettings
    {
        public int BatchSize { get; set; } = 1000;
        public bool EnableLogging { get; set; } = true;
        public bool SkipDeletedRecords { get; set; } = true;
    }
}