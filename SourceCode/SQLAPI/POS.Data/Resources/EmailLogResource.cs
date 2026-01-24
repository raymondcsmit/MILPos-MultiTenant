namespace POS.Data.Resources
{
    public class EmailLogResource : ResourceParameter
    {
        public EmailLogResource() : base("SentAt")
        {
        }
        public string SenderEmail { get; set; }
        public string RecipientEmail { get; set; }
        public string Subject { get; set; }
    }
}
