using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Common.UnitOfWork;
using POS.Data.Dto;
using POS.Domain;
using POS.Helper;
using POS.MediatR.PageHelper.Commands;
using POS.Repository;

namespace POS.MediatR.PageHelper.Handlers
{
    public class UpdatePageHelperCommandHandler : IRequestHandler<UpdatePageHelperCommand, ServiceResponse<PageHelperDto>>
    {
        private readonly IPageHelperRepository _pageHelperRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly IMapper _mapper;
        public UpdatePageHelperCommandHandler(IPageHelperRepository pageHelperRepository,
            IMapper mapper,
            IUnitOfWork<POSDbContext> uow)
        {
            _pageHelperRepository = pageHelperRepository;
            _mapper = mapper;
            _uow = uow;
        }

        public async Task<ServiceResponse<PageHelperDto>> Handle(UpdatePageHelperCommand request, CancellationToken cancellationToken)
        {
            var entityExist = await _pageHelperRepository.All.FirstOrDefaultAsync(c => c.Name.ToUpper() == request.Name.ToUpper() && c.Id != request.Id);
            if (entityExist != null)
            {
                return ServiceResponse<PageHelperDto>.Return409("Page Helper with same name already exists.");
            }

            entityExist = await _pageHelperRepository.All.FirstOrDefaultAsync(c => c.Id == request.Id);

            if (entityExist == null)
            {
                return ServiceResponse<PageHelperDto>.Return409("Page Helper does not exists.");
            }

            entityExist.Name = request.Name;
            entityExist.Description = request.Description;
            _pageHelperRepository.Update(entityExist);

            if (await _uow.SaveAsync() <= 0)
            {
                return ServiceResponse<PageHelperDto>.Return500();
            }

            var entityDto = _mapper.Map<PageHelperDto>(entityExist);
            return ServiceResponse<PageHelperDto>.ReturnResultWith200(entityDto);
        }
    }
}
