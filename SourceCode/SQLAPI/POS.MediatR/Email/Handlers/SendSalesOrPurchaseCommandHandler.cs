using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Helper;
using POS.MediatR.Email.Commands;
using POS.Repository;

namespace POS.MediatR.Email.Handlers
{
    public class SendSalesOrPurchaseCommandHandler(
        IEmailSMTPSettingRepository emailSMTPSettingRepository,
        IEmailRepository emailRepository)
        : IRequestHandler<SendSalesOrPurchaseCommand, ServiceResponse<bool>>
    {
        public async Task<ServiceResponse<bool>> Handle(SendSalesOrPurchaseCommand request, CancellationToken cancellationToken)
        {
            var defaultSmtp = await emailSMTPSettingRepository.All.FirstOrDefaultAsync();
            if (defaultSmtp == null)
            {
                return ServiceResponse<bool>.ReturnFailed(404, "Email SMTP Setting not found");
            }

            var fileSource = Convert.FromBase64String(request.Attachement); ;
            var attechment = new Helper.FileInfo
            {
                Extension = "pdf",
                Name = request.Name,
                Src = fileSource,
                FileType = request.FileType
            };

            await emailRepository.SendEmail(new SendEmailSpecification
            {
                Body = request.Message,
                FromAddress = defaultSmtp.FromEmail,
                Host = defaultSmtp.Host,
                Password = defaultSmtp.Password,
                Port = defaultSmtp.Port,
                Subject = request.Subject,
                ToAddress = request.ToAddress,
                CCAddress = "",
                UserName = defaultSmtp.UserName,
                Attechments = [attechment],
                EncryptionType = defaultSmtp.EncryptionType,
                FromName = defaultSmtp.FromName
            });

            return ServiceResponse<bool>.ReturnSuccess();
        }
    }
}
