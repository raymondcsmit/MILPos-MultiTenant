using System;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Common.UnitOfWork;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Domain;
using POS.Helper;
using POS.MediatR.PageHelper.Commands;
using POS.Repository;

namespace POS.MediatR.PageHelper.Handlers
{
    public class AddPageHelperCommandHandler : IRequestHandler<AddPageHelperCommand, ServiceResponse<PageHelperDto>>
    {
        private readonly IPageHelperRepository _pageHelperRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly IMapper _mapper;
        public AddPageHelperCommandHandler(IPageHelperRepository pageHelperRepository,
            IMapper mapper,
            IUnitOfWork<POSDbContext> uow)
        {
            _pageHelperRepository = pageHelperRepository;
            _mapper = mapper;
            _uow = uow;
        }
        public async Task<ServiceResponse<PageHelperDto>> Handle(AddPageHelperCommand request, CancellationToken cancellationToken)
        {
            var entityExist = await _pageHelperRepository.FindBy(c => c.Name.ToUpper() == request.Name.ToUpper()).FirstOrDefaultAsync();
            if (entityExist != null)
            {
                return ServiceResponse<PageHelperDto>.Return409("Page helper with same name already exists.");
            }

            var entity = _mapper.Map<POS.Data.Entities.PageHelper>(request); // Update this line
            entity.Code = entity.Name.ToUpper().Replace(" ", "_");
            entity.Id = Guid.NewGuid();

            _pageHelperRepository.Add(entity);
            if (await _uow.SaveAsync() <= 0)
            {
                return ServiceResponse<PageHelperDto>.Return500();
            }
            var entityDto = _mapper.Map<PageHelperDto>(entity);
            return ServiceResponse<PageHelperDto>.ReturnResultWith201(entityDto);
        }
    }
}
