using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Domain;
using POS.Helper;
using POS.MediatR.MenuItem.Commands;
using POS.Repository;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.MenuItem.Handlers
{
    public class DeleteMenuItemCommandHandler : IRequestHandler<DeleteMenuItemCommand, ServiceResponse<bool>>
    {
        private readonly IMenuItemRepository _menuItemRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly ILogger<DeleteMenuItemCommandHandler> _logger;

        public DeleteMenuItemCommandHandler(
            IMenuItemRepository menuItemRepository,
            IUnitOfWork<POSDbContext> uow,
            ILogger<DeleteMenuItemCommandHandler> logger)
        {
            _menuItemRepository = menuItemRepository;
            _uow = uow;
            _logger = logger;
        }

        public async Task<ServiceResponse<bool>> Handle(DeleteMenuItemCommand request, CancellationToken cancellationToken)
        {
            var entity = await _menuItemRepository.FindBy(m => m.Id == request.Id).FirstOrDefaultAsync();
            if (entity == null)
            {
                _logger.LogError("MenuItem does not exist.");
                return ServiceResponse<bool>.Return404();
            }

            // Check if it has children
            var hasChildren = await _menuItemRepository.FindBy(m => m.ParentId == request.Id && !m.IsDeleted).AnyAsync();
            if (hasChildren)
            {
                return ServiceResponse<bool>.Return409("Cannot delete menu item with children.");
            }

            entity.IsDeleted = true;
            entity.DeletedDate = DateTime.UtcNow;
            
            _menuItemRepository.Update(entity);

            if (await _uow.SaveAsync() <= 0)
            {
                return ServiceResponse<bool>.Return500();
            }

            return ServiceResponse<bool>.ReturnResultWith200(true);
        }
    }
}
