using MediatR;
using System.Collections.Generic;
using POS.Data.Dto;
using POS.Helper;

namespace POS.MediatR.CommandAndQuery
{
    public class SendEmailCommand : IRequest<ServiceResponse<EmailDto>>
    {
        public string Subject { get; set; }
        public string ToAddress { get; set; }
        public string CCAddress { get; set; }
        public List<FileAttachment> Attechments { get; set; } = new List<FileAttachment>();
        public string Body { get; set; }
        public string FromAddress { get; set; }
    }

    public class FileAttachment
    {
        public string Name { get; set; }
        public string Extension { get; set; }
        public string FileType { get; set; }
        public string src { get; set; }
    }

}
