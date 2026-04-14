using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data.Entities;
using POS.Domain;

namespace POS.Repository
{
    public class InquiryAttachmentRepository : GenericRepository<InquiryAttachment, POSDbContext>, IInquiryAttachmentRepository
    {
        public InquiryAttachmentRepository(IUnitOfWork<POSDbContext> uow) : base(uow)
        {

        }
    }
}
