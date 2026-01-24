using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Data.Resources;
using POS.Domain;
using POS.Helper;

namespace POS.Repository
{
    public class EmailLogRepository : GenericRepository<EmailLog, POSDbContext>, IEmailLogRepository
    {
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly ILogger<EmailLogRepository> _logger;
        private readonly IPropertyMappingService _propertyMappingService;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly PathHelper _pathHelper;
        public EmailLogRepository(
            IUnitOfWork<POSDbContext> uow,
            ILogger<EmailLogRepository> logger,
            IPropertyMappingService propertyMappingService,
            IWebHostEnvironment webHostEnvironment,
            PathHelper pathHelper
            ) : base(uow)
        {
            _uow = uow;
            _logger = logger;
            _propertyMappingService = propertyMappingService;
            _webHostEnvironment = webHostEnvironment;
            _pathHelper = pathHelper;
        }

        public async Task<EmailLogList> GetEmailLogs(EmailLogResource emailLogResource)
        {
            var collectionBeforePaging = AllIncluding(c => c.EmailLogAttachments);
            collectionBeforePaging =
               collectionBeforePaging.ApplySort(emailLogResource.OrderBy,
               _propertyMappingService.GetPropertyMapping<EmailLogDto, EmailLog>());

            if (!string.IsNullOrWhiteSpace(emailLogResource.Subject))
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(c => EF.Functions.Like(c.Subject, $"%{emailLogResource.Subject}%"));
            }
            if (!string.IsNullOrWhiteSpace(emailLogResource.SenderEmail))
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(c => EF.Functions.Like(c.SenderEmail, $"%{emailLogResource.SenderEmail}%"));
            }
            if (!string.IsNullOrWhiteSpace(emailLogResource.RecipientEmail))
            {
                collectionBeforePaging = collectionBeforePaging
                    .Where(c => EF.Functions.Like(c.RecipientEmail, $"%{emailLogResource.RecipientEmail}%"));
            }

            var loginAudits = new EmailLogList();
            return await loginAudits.Create(
                collectionBeforePaging,
                emailLogResource.Skip,
                emailLogResource.PageSize
                );
        }

        public async Task CreateEmailLog(SendEmailSpecification emailSpecification, string error)
        {
            try
            {
                var log = new EmailLog
                {
                    Id = Guid.NewGuid(),
                    SenderEmail = emailSpecification.FromAddress,
                    RecipientEmail = emailSpecification.ToAddress,
                    Subject = emailSpecification.Subject,
                    Body = emailSpecification.Body,
                    ErrorMessage = error,
                    SentAt = DateTime.UtcNow,
                    Status = !string.IsNullOrWhiteSpace(error) ? EmailStatus.Failed : EmailStatus.Sent,
                };

                foreach (var attachment in emailSpecification.Attechments)
                {
                    try
                    {

                        if (!Directory.Exists(Path.Combine(_webHostEnvironment.WebRootPath, _pathHelper.EmailAttachmentPath)))
                        {
                            Directory.CreateDirectory(Path.Combine(_webHostEnvironment.WebRootPath, _pathHelper.EmailAttachmentPath));
                        }

                        var attachmentPath = Path.Combine(_pathHelper.EmailAttachmentPath, $"{Guid.NewGuid()}.{attachment.Extension}");
                        var filePath = Path.Combine(_webHostEnvironment.WebRootPath, attachmentPath);

                        File.WriteAllBytes(filePath, attachment.Src);

                        var emailLogAttachment = new EmailLogAttachment
                        {
                            Id = Guid.NewGuid(),
                            EmailLogId = log.Id,
                            Path = attachmentPath,
                            Name = attachment.Name
                        };
                        log.EmailLogAttachments.Add(emailLogAttachment);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error while saving attachment.");
                    }
                }

                Add(log);
                await _uow.SaveAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "error while saving email logs.");
            }
        }
    }
}
