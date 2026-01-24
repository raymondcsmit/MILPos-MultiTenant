using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;
using POS.Data.Dto;
using POS.Helper;
using POS.MediatR.CommandAndQuery;
using POS.Repository;
using System.Collections.Generic;
using System.Linq;

namespace POS.MediatR.Handlers
{
    public class SendEmailCommandHandler : IRequestHandler<SendEmailCommand, ServiceResponse<EmailDto>>
    {
        private readonly IEmailSMTPSettingRepository _emailSMTPSettingRepository;
        private readonly ILogger<SendEmailCommandHandler> _logger;
        private readonly IEmailRepository _emailRepository;
        public SendEmailCommandHandler(
           IEmailSMTPSettingRepository emailSMTPSettingRepository,
            ILogger<SendEmailCommandHandler> logger,
            IEmailRepository emailRepository
            )
        {
            _emailSMTPSettingRepository = emailSMTPSettingRepository;
            _logger = logger;
            _emailRepository = emailRepository;
        }
        public async Task<ServiceResponse<EmailDto>> Handle(SendEmailCommand request, CancellationToken cancellationToken)
        {
            var defaultSmtp = await _emailSMTPSettingRepository.FindBy(c => c.IsDefault).FirstOrDefaultAsync();
            if (defaultSmtp == null)
            {
                _logger.LogError("Default SMTP setting does not exist.");
                return ServiceResponse<EmailDto>.Return404("Default SMTP setting does not exist.");
            }
            try
            {
                List<FileInfo> files = [];

                foreach (var attachment in request.Attechments)
                {
                    var src = attachment.src.Split(',').LastOrDefault();
                    files.Add(new FileInfo
                    {
                        Extension = attachment.Extension,
                        FileType = attachment.FileType,
                        Name = attachment.Name,
                        Src = Convert.FromBase64String(src)
                    });
                }

                await _emailRepository.SendEmail(new SendEmailSpecification
                {
                    Body = request.Body,
                    FromAddress = defaultSmtp.FromEmail,
                    Host = defaultSmtp.Host,
                    Password = defaultSmtp.Password,
                    Port = defaultSmtp.Port,
                    Subject = request.Subject,
                    ToAddress = request.ToAddress,
                    CCAddress = request.CCAddress,
                    UserName = defaultSmtp.UserName,
                    Attechments = files,
                    EncryptionType = defaultSmtp.EncryptionType,
                    FromName = defaultSmtp.FromName
                });
                return ServiceResponse<EmailDto>.ReturnSuccess();
            }
            catch (Exception e)
            {
                _logger.LogError(e.Message, e);
                return ServiceResponse<EmailDto>.ReturnFailed(500, e.Message);
            }
        }
    }
}
