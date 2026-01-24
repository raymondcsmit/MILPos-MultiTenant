using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using MimeKit;
using POS.Helper;

namespace POS.Repository
{
    public class EmailRepository(ILogger<EmailRepository> logger,
        IEmailLogRepository emailLogRepository) : IEmailRepository
    {
        public async Task<bool> SendEmail(SendEmailSpecification sendEmailSpecification)
        {
            var errorMessage = string.Empty;
            try
            {
                var message = new MimeMessage();

                // Sender information
                message.From.Add(new MailboxAddress(sendEmailSpecification.FromName ?? sendEmailSpecification.FromAddress, sendEmailSpecification.FromAddress));

                // Recipient information
                message.To.Add(new MailboxAddress(sendEmailSpecification.ToName ?? sendEmailSpecification.ToAddress, sendEmailSpecification.ToAddress));

                if (!string.IsNullOrWhiteSpace(sendEmailSpecification.CCAddress))
                {
                    InternetAddressList list = new InternetAddressList();
                    var emails = sendEmailSpecification.CCAddress.Split(",");
                    foreach (var email in emails)
                    {
                        list.Add(new MailboxAddress(email, email));
                    }

                    message.Cc.AddRange(list);
                }

                // Subject
                message.Subject = sendEmailSpecification.Subject;

                if (sendEmailSpecification.Attechments.Count > 0)
                {

                    var body = new TextPart("html")
                    {
                        Text = sendEmailSpecification.Body
                    };

                    // Create a multipart email to hold both the body and attachment
                    var multipart = new Multipart("mixed")
                    {
                        body // Add the body part
                    };

                    foreach (var file in sendEmailSpecification.Attechments)
                    {
                        var ms = new MemoryStream(file.Src);
                        var attachment = new MimePart("application", "octet-stream")
                        {
                            Content = new MimeContent(ms),
                            ContentDisposition = new ContentDisposition(ContentDisposition.Attachment),
                            ContentTransferEncoding = ContentEncoding.Base64,
                            FileName = file.Name,
                        };

                        multipart.Add(attachment);
                    }
                    message.Body = multipart;
                }
                else
                {
                    message.Body = new TextPart("html")
                    {
                        Text = sendEmailSpecification.Body
                    };
                }

                // Set the email body to the multipart content
                var encryptionType = SecureSocketOptions.Auto;
                if (sendEmailSpecification.EncryptionType == "None")
                {
                    encryptionType = SecureSocketOptions.None;
                }
                else if (sendEmailSpecification.EncryptionType == "ssl")
                {
                    encryptionType = SecureSocketOptions.SslOnConnect;
                }
                else if (sendEmailSpecification.EncryptionType == "tls")
                {
                    encryptionType = SecureSocketOptions.StartTls;
                }
                else if (sendEmailSpecification.EncryptionType == "starttls")
                {
                    encryptionType = SecureSocketOptions.StartTlsWhenAvailable;
                }

                // SMTP server configuration
                using (var client = new MailKit.Net.Smtp.SmtpClient())
                {
                    await client.ConnectAsync(sendEmailSpecification.Host, sendEmailSpecification.Port, encryptionType);
                    await client.AuthenticateAsync(sendEmailSpecification.UserName, sendEmailSpecification.Password);

                    // Send the email
                    client.Timeout = 30000;
                    await client.SendAsync(message);
                    await client.DisconnectAsync(true);
                }

                return true;
            }
            catch (Exception ex)
            {
                errorMessage = ex.Message;
                logger.LogError(ex, "Error while sending email");
                return false;
            }
            finally
            {
                await emailLogRepository.CreateEmailLog(sendEmailSpecification, errorMessage);
            }
        }
    }
}
