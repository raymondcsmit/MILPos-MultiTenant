using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Domain;
using POS.Helper;
using POS.MediatR.Accouting.Strategies;
using POS.MediatR.UnitConversation.Commands;
using POS.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.UnitConversation.Handlers
{
    public class DeleteUnitConversationCommandHandlers : IRequestHandler<DeleteUnitConversationCommand, ServiceResponse<bool>>
    {
        private readonly IUnitConversationRepository _unitConversationRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly IMapper _mapper;
        private readonly ILogger<DeleteUnitConversationCommandHandlers> _logger;
        private readonly ISalesOrderRepository _salesOrderRepository;
        private readonly IPurchaseOrderRepository _purchaseOrderRepository;
        private readonly IProductRepository _productRepository;
        public DeleteUnitConversationCommandHandlers(
          IUnitConversationRepository unitConversationRepository,
            IMapper mapper,
            IUnitOfWork<POSDbContext> uow,
            ILogger<DeleteUnitConversationCommandHandlers> logger,
            ISalesOrderRepository salesOrderRepository,
            IPurchaseOrderRepository purchaseOrderRepository,
            IProductRepository productRepository
            )
        {
            _unitConversationRepository= unitConversationRepository;
            _mapper = mapper;
            _uow = uow;
            _logger = logger;
            _salesOrderRepository = salesOrderRepository;
            _purchaseOrderRepository = purchaseOrderRepository;
            _productRepository = productRepository;
        }
        public async Task<ServiceResponse<bool>> Handle(DeleteUnitConversationCommand request, CancellationToken cancellationToken)
        {
            var existingEntity = await _unitConversationRepository
                .FindAsync(request.Id);
            if (existingEntity == null)
            {
                _logger.LogError("Unit Conversation not Exists");
                return ServiceResponse<bool>.Return409("Unit Conversation not Exists.");
            }
            var product =await _productRepository.All.Where(c=>c.UnitId==request.Id).FirstOrDefaultAsync();
            if (product != null)
            {
                return ServiceResponse<bool>.Return409("Unit can't delete becuase this unit already used in product");
            }
            var salesOrder =await  _salesOrderRepository.All
                .Where(c=>!c.IsDeleted && c.SalesOrderItems.Select(c=>c.UnitId).Contains(request.Id)).FirstOrDefaultAsync();
            if(salesOrder != null)
            {
                return ServiceResponse<bool>.Return409("Unit can't delete becuase this unit already used in sales order");
            }
            var purchaseOrder = await _purchaseOrderRepository.All
               .Where(c => !c.IsDeleted && c.PurchaseOrderItems.Select(c => c.UnitId).Contains(request.Id)).FirstOrDefaultAsync();
            if (purchaseOrder != null)
            {
                return ServiceResponse<bool>.Return409("Unit can't delete becuase this unit already used in purchase order");
            }
           
            _unitConversationRepository.Delete(existingEntity);
            if (await _uow.SaveAsync() <= 0)
            {

                _logger.LogError("Error While saving Unit Conversation.");
                return ServiceResponse<bool>.Return500();
            }
            return ServiceResponse<bool>.ReturnResultWith200(true);
        }
    }
}