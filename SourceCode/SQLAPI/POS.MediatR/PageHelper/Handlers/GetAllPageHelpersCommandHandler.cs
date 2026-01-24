using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto;
using POS.MediatR.PageHelper.Commands;
using POS.Repository;

namespace POS.MediatR.PageHelper.Handlers
{
    public class GetAllPageHelpersCommandHandler : IRequestHandler<GetAllPageHelpersCommand, List<PageHelperDto>>
    {
        private readonly IPageHelperRepository _pageHelperRepository;
        public GetAllPageHelpersCommandHandler(IPageHelperRepository pageHelperRepository)
        {
            _pageHelperRepository = pageHelperRepository;
        }

        public async Task<List<PageHelperDto>> Handle(GetAllPageHelpersCommand request, CancellationToken cancellationToken)
        {
            var entities = await _pageHelperRepository.All.Select(c => new PageHelperDto
            {
                Id = c.Id,
                Code = c.Code,
                Name = c.Name
            }).ToListAsync();

            return entities;
        }
    }
}
