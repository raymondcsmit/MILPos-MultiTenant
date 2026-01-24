using System;

namespace POS.Data.Dto
{
    public class EmailSMTPSettingDto
    {
        public Guid? Id { get; set; }
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
