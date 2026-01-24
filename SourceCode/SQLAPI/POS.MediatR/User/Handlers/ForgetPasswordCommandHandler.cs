using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using POS.Common.UnitOfWork;
using POS.Domain;
using POS.Helper;
using POS.Repository;

namespace POS.MediatR
{
    public class ForgetPasswordCommandHandler(
        IEmailSMTPSettingRepository emailSMTPSettingRepository,
        IWebHostEnvironment webHostEnvironment,
        IUserRepository userRepository,
        IUnitOfWork<POSDbContext> unitOfWork,
        IEmailRepository emailRepository)
        : IRequestHandler<ForgetPasswordCommand, ServiceResponse<bool>>
    {
        public async Task<ServiceResponse<bool>> Handle(ForgetPasswordCommand request, CancellationToken cancellationToken)
        {
            var user = await userRepository.All.Where(c => c.Email == request.Email).FirstOrDefaultAsync();
            if (user == null)
            {
                return ServiceResponse<bool>.Return404("User not found.");
            }

            var defaultSmtp = await emailSMTPSettingRepository.All.Where(c => c.IsDefault).FirstOrDefaultAsync();
            if (defaultSmtp == null)
            {
                return ServiceResponse<bool>.Return404("Email SMTP setting not found.");
            }
            var plainTextBytes = Encoding.UTF8.GetBytes(Guid.NewGuid().ToString());
            user.ResetPasswordCode = Convert.ToBase64String(plainTextBytes);

            var resetPasswordTemplateUrl = Path.Combine(webHostEnvironment.WebRootPath, "reset-password-template.html");
            if (!File.Exists(resetPasswordTemplateUrl))
            {
                return ServiceResponse<bool>.Return404("Error while sending email");
            }

            var emailBody = File.ReadAllText(resetPasswordTemplateUrl);
            var url = $"{request.HostUrl}/reset-password/{user.ResetPasswordCode}";

            emailBody = emailBody.Replace("##RESET_LINK##", url);

            await emailRepository.SendEmail(new SendEmailSpecification
            {
                Body = emailBody,
                FromAddress = defaultSmtp.FromEmail,
                Host = defaultSmtp.Host,
                Password = defaultSmtp.Password,
                Port = defaultSmtp.Port,
                Subject = "Reset Password",
                ToAddress = user.Email,
                CCAddress = "",
                UserName = defaultSmtp.UserName,
                Attechments = [],
                EncryptionType = defaultSmtp.EncryptionType,
                FromName = defaultSmtp.FromName,
                ToName = user.FirstName + " " + user.LastName
            });

            userRepository.Update(user);

            if (await unitOfWork.SaveAsync() < 0)
            {
                return ServiceResponse<bool>.Return500();
            }

            return ServiceResponse<bool>.ReturnSuccess();

        }
    }
}
