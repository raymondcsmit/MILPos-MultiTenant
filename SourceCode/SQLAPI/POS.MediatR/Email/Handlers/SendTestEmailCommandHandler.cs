using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.Extensions.Logging;
using POS.Helper;
using POS.MediatR.Email.Commands;
using POS.Repository;

namespace POS.MediatR.Email.Handlers
{
    public class SendTestEmailCommandHandler(
            ILogger<SendTestEmailCommandHandler> logger,
            IEmailRepository emailRepository
            ) : IRequestHandler<SendTestEmailCommand, ServiceResponse<bool>>
    {
        public async Task<ServiceResponse<bool>> Handle(SendTestEmailCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var data = new SendEmailSpecification
                {
                    Body = "Dear User,\n\nThis is a test email to verify the SMTP configuration. If you're receiving this email, the SMTP settings are working correctly.\n\nBest regards",
                    FromAddress = request.FromEmail,
                    FromName = request.FromName,
                    Host = request.Host,
                    EncryptionType = request.EncryptionType,
                    Password = request.Password,
                    Port = request.Port,
                    Subject = "SMTP Configuration Test",
                    ToAddress = request.ToEmail,
                    CCAddress = "",
                    UserName = request.UserName
                };

                var emailTestResult = await emailRepository.SendEmail(data);
                if (!emailTestResult)
                {
                    return ServiceResponse<bool>.Return422("SMTP configuration is incorrect, please check the settings and try again.");
                }
                return ServiceResponse<bool>.ReturnSuccess();
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error while sending test email");
                return ServiceResponse<bool>.Return422("SMTP configuration is incorrect, please check the settings and try again.");
            }
        }
    }
}
