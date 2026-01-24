using System.IO;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Domain;
using POS.Helper;
using POS.MediatR.EmailLog.Commands;
using POS.Repository;

namespace POS.MediatR.EmailLog.Handlers
{
    public class DeleteEmailLogCommandHandler(
        IEmailLogRepository _emailLogRepository,
        IUnitOfWork<POSDbContext> _uow,
        ILogger<DeleteEmailLogCommandHandler> logger,
        IWebHostEnvironment webHostEnvironment) : IRequestHandler<DeleteEmailLogCommand, ServiceResponse<bool>>
    {
        public async Task<ServiceResponse<bool>> Handle(DeleteEmailLogCommand request, CancellationToken cancellationToken)
        {
            var entityExist = await _emailLogRepository.All.Include(c => c.EmailLogAttachments).FirstOrDefaultAsync(d => d.Id == request.Id);

            if (entityExist == null)
            {
                return ServiceResponse<bool>.Return404();
            }

            _emailLogRepository.Remove(entityExist);

            if (await _uow.SaveAsync() <= 0)
            {
                return ServiceResponse<bool>.Return500();
            }

            try
            {
                foreach (var attachment in entityExist.EmailLogAttachments)
                {
                    var attachmentPath = Path.Combine(webHostEnvironment.WebRootPath, attachment.Path);
                    if (File.Exists(attachmentPath))
                    {
                        File.Delete(attachmentPath);
                    }
                }
            }
            catch (System.Exception ex)
            {
                logger.LogError(ex, "error while deleting the email logs");
            }

            return ServiceResponse<bool>.ReturnResultWith200(true);
        }
    }
}
