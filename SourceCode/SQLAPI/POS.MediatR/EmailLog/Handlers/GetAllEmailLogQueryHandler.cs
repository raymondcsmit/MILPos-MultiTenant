using System.Threading;
using System.Threading.Tasks;
using MediatR;
using POS.MediatR.CommandAndQuery;
using POS.Repository;

namespace POS.MediatR.Handlers
{
    public class GetAllEmailLogQueryHandler (IEmailLogRepository _emailLogRepository): IRequestHandler<GetAllEmailLogQuery, EmailLogList>
    {
        public async Task<EmailLogList> Handle(GetAllEmailLogQuery request, CancellationToken cancellationToken)
        {
            return await _emailLogRepository.GetEmailLogs(request.EmailLogResource);
        }
    }
}