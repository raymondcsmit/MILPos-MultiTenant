using MediatR;
using POS.Data.Resources;
using POS.Repository;

namespace POS.MediatR.CommandAndQuery
{
    public class GetAllEmailLogQuery : IRequest<EmailLogList>
    {
        public EmailLogResource EmailLogResource { get; set; }
    }
}