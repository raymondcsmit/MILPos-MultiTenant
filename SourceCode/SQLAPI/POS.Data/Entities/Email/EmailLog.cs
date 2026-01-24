using System;
using System.Collections.Generic;

namespace POS.Data
{
    public class EmailLog
    {
        public Guid Id { get; set; }
        public string SenderEmail { get; set; }
        public string RecipientEmail { get; set; }
        public string Subject { get; set; }
        public string Body { get; set; }
        public EmailStatus Status { get; set; }
        public string ErrorMessage { get; set; }
        public DateTime SentAt { get; set; }
        public List<EmailLogAttachment> EmailLogAttachments { get; set; } = [];
    }

    public enum EmailStatus
    {
        Sent,
        Failed
    }
}
