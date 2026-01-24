
using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace POS.Data
{
    public class EmailLogAttachment
    {
        public Guid Id { get; set; }
        public Guid EmailLogId { get; set; }
        [ForeignKey("EmailLogId")]
        public EmailLog EmailLogs { get; set; }
        public string Path { get; set; }
        public string Name { get; set; }
    }
}
