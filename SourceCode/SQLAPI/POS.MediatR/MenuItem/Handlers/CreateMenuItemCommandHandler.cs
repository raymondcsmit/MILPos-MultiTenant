using AutoMapper;
using MediatR;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Domain;
using POS.Helper;
using POS.MediatR.MenuItem.Commands;
using POS.Repository;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.MenuItem.Handlers
{
    public class CreateMenuItemCommandHandler : IRequestHandler<CreateMenuItemCommand, ServiceResponse<MenuItemDto>>
    {
        private readonly IMenuItemRepository _menuItemRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly IMapper _mapper;

        public CreateMenuItemCommandHandler(
            IMenuItemRepository menuItemRepository,
            IUnitOfWork<POSDbContext> uow,
            IMapper mapper)
        {
            _menuItemRepository = menuItemRepository;
            _uow = uow;
            _mapper = mapper;
        }

        public async Task<ServiceResponse<MenuItemDto>> Handle(CreateMenuItemCommand request, CancellationToken cancellationToken)
        {
            var entity = _mapper.Map<POS.Data.MenuItem>(request);
            entity.Id = Guid.NewGuid();
            _menuItemRepository.Add(entity);
            await _uow.SaveAsync();

            return ServiceResponse<MenuItemDto>.ReturnResultWith200(_mapper.Map<MenuItemDto>(entity));
        }
    }
}
