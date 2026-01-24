using System;
using System.Collections.Generic;
using POS.Data.Entities;

namespace POS.Data.Dto
{
    public class EmailLogDto
    {
        public Guid Id { get; set; }
        public string SenderEmail { get; set; }
        public string RecipientEmail { get; set; }
        public string Subject { get; set; }
        public string Body { get; set; }
        public EmailStatus Status { get; set; }
        public string ErrorMessage { get; set; }
        public DateTime SentAt { get; set; }
        public string StatusName { get; set; }
        public List<EmailLogAttachment> EmailLogAttachments { get; set; }
    }
}
