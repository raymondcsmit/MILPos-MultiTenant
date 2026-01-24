using MediatR;
using POS.Data.Dto;
using POS.Helper;

namespace POS.MediatR.CommandAndQuery
{
    public class AddEmailSMTPSettingCommand : IRequest<ServiceResponse<EmailSMTPSettingDto>>
    {
        public string Host { get; set; }
        public string UserName { get; set; }
        public string Password { get; set; }
        public int Port { get; set; }
        public bool IsDefault { get; set; }
        public string EncryptionType { get; set; }
        public string FromEmail { get; set; }
        public string FromName { get; set; }
    }
}
