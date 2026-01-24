using System.Threading;
using System.Threading.Tasks;
using MediatR;
using POS.Common.UnitOfWork;
using POS.Domain;
using POS.Helper;
using POS.MediatR.PageHelper.Commands;
using POS.Repository;

namespace POS.MediatR.PageHelper.Handlers
{
    public class DeletePageHelperCommandHandler : IRequestHandler<DeletePageHelperCommand, ServiceResponse<bool>>
    {
        private readonly IPageHelperRepository _pageHelperRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;

        public DeletePageHelperCommandHandler(
           IPageHelperRepository pageHelperRepository,
            IUnitOfWork<POSDbContext> uow)
        {
            _pageHelperRepository = pageHelperRepository;
            _uow = uow;
        }
        public async Task<ServiceResponse<bool>> Handle(DeletePageHelperCommand request, CancellationToken cancellationToken)
        {
            var entityExist = await _pageHelperRepository.FindAsync(request.Id);

            if (entityExist == null)
            {
                return ServiceResponse<bool>.Return404();
            }

            _pageHelperRepository.Delete(request.Id);

            if (await _uow.SaveAsync() <= 0)
            {
                return ServiceResponse<bool>.Return500();
            }
            return ServiceResponse<bool>.ReturnSuccess();
        }
    }
}
