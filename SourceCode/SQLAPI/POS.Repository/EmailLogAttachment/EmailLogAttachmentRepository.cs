using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Entities;
using POS.Domain;

namespace POS.Repository
{
    public class EmailLogAttachmentRepository : GenericRepository<EmailLogAttachment, POSDbContext>, IEmailLogAttachmentRepository
    {
        public EmailLogAttachmentRepository(IUnitOfWork<POSDbContext> uow) : base(uow)
        {
        }
    }
}
