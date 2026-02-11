namespace POS.MediatR.Tenant.Commands
{
    public class ExportTenantToSqliteCommandResponse
    {
        public byte[] FileContent { get; set; }
        public string FileName { get; set; }
        public string ContentType { get; set; }
    }
}
