using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto;
using POS.Helper;
using POS.MediatR.PageHelper.Commands;
using POS.Repository;

namespace POS.MediatR.PageHelper.Handlers
{
    public class GetPageHelperByCodeCommandHandler : IRequestHandler<GetPageHelperByCodeCommand, ServiceResponse<PageHelperDto>>
    {
        private readonly IPageHelperRepository _pageHelperRepository;
        private readonly IMapper _mapper;
        public GetPageHelperByCodeCommandHandler(
           IPageHelperRepository pageHelperRepository,
            IMapper mapper
            )
        {
            _pageHelperRepository = pageHelperRepository;
            _mapper = mapper;
        }

        public async Task<ServiceResponse<PageHelperDto>> Handle(GetPageHelperByCodeCommand request, CancellationToken cancellationToken)
        {
            var entity = await _pageHelperRepository.All.FirstOrDefaultAsync(c => c.Code == request.Code);
            if (entity != null)
            {
                var dto = _mapper.Map<PageHelperDto>(entity);
                return ServiceResponse<PageHelperDto>.ReturnResultWith200(dto);
            }
            return ServiceResponse<PageHelperDto>.Return404("Page Helper not found");
        }
    }
}
