using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Data.Dto;
using POS.Helper;
using POS.MediatR.CommandAndQuery;
using POS.Repository;

namespace POS.MediatR.EmailLog.Handlers
{
    public class GetEmailAttachmentQueryHandler (ILogger<GetEmailAttachmentQuery> _logger,IMapper _mapper,IEmailLogAttachmentRepository _emailLogAttachmentRepository): IRequestHandler<GetEmailAttachmentQuery, ServiceResponse<EmailLogAttachmentDto>>
    {
        public async Task<ServiceResponse<EmailLogAttachmentDto>> Handle(GetEmailAttachmentQuery request, CancellationToken cancellationToken)
        {
            var entity = await _emailLogAttachmentRepository.FindBy(c => c.Id == request.Id).FirstOrDefaultAsync();
            if (entity == null)
            {
                _logger.LogError("Data is not exists");
                return ServiceResponse<EmailLogAttachmentDto>.Return404();
            }
            var entityDto = _mapper.Map<EmailLogAttachmentDto>(entity);
            return ServiceResponse<EmailLogAttachmentDto>.ReturnResultWith200(entityDto);
        }
    }
}
