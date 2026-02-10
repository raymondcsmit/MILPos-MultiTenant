using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Domain;
using POS.Helper;
using POS.MediatR.MenuItem.Commands;
using POS.Repository;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.MenuItem.Handlers
{
    public class UpdateMenuItemCommandHandler : IRequestHandler<UpdateMenuItemCommand, ServiceResponse<MenuItemDto>>
    {
        private readonly IMenuItemRepository _menuItemRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly IMapper _mapper;
        private readonly ILogger<UpdateMenuItemCommandHandler> _logger;

        public UpdateMenuItemCommandHandler(
            IMenuItemRepository menuItemRepository,
            IUnitOfWork<POSDbContext> uow,
            IMapper mapper,
            ILogger<UpdateMenuItemCommandHandler> logger)
        {
            _menuItemRepository = menuItemRepository;
            _uow = uow;
            _mapper = mapper;
            _logger = logger;
        }

        public async Task<ServiceResponse<MenuItemDto>> Handle(UpdateMenuItemCommand request, CancellationToken cancellationToken)
        {
            var entity = await _menuItemRepository.FindBy(m => m.Id == request.Id).FirstOrDefaultAsync();
            if (entity == null)
            {
                _logger.LogError("MenuItem does not exist.");
                return ServiceResponse<MenuItemDto>.Return404();
            }

            _mapper.Map(request, entity);
            _menuItemRepository.Update(entity);
            
            if (await _uow.SaveAsync() <= 0)
            {
                return ServiceResponse<MenuItemDto>.Return500();
            }

            return ServiceResponse<MenuItemDto>.ReturnResultWith200(_mapper.Map<MenuItemDto>(entity));
        }
    }
}
