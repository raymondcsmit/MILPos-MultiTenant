using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Domain;
using POS.Helper;
using POS.MediatR.Product.Command;
using POS.Repository;

namespace POS.MediatR.Product.Handler
{
    public class DeleteProductCommandHandler
    : IRequestHandler<DeleteProductCommand, ServiceResponse<bool>>
    {

        private readonly IProductRepository _productRepository;
        private readonly IPurchaseOrderRepository _purchaseOrderRepository;
        private readonly ISalesOrderRepository _salesOrderRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly ILogger<DeleteProductCommandHandler> _logger;
        public readonly IStockTransferItemRepository _stockTransferItemRepository;

        public DeleteProductCommandHandler(IProductRepository productRepository,
            IUnitOfWork<POSDbContext> uow,
            IPurchaseOrderRepository purchaseOrderRepository,
            ISalesOrderRepository salesOrderRepository,
            ILogger<DeleteProductCommandHandler> logger,
            IStockTransferItemRepository stockTransferItemRepository)
        {
            _productRepository = productRepository;
            _purchaseOrderRepository = purchaseOrderRepository;
            _salesOrderRepository = salesOrderRepository;
            _uow = uow;
            _logger = logger;
            _stockTransferItemRepository = stockTransferItemRepository;
        }
        public async Task<ServiceResponse<bool>> Handle(DeleteProductCommand request, CancellationToken cancellationToken)
        {
            var existingProducts = await _productRepository.All.Where(c => c.ParentId == request.Id || c.Id == request.Id).ToListAsync();
            if (existingProducts.Count == 0)
            {
                _logger.LogError("Proudct does not exists.");
                return ServiceResponse<bool>.Return404("Proudct does not exists.");
            }
            foreach (var item in existingProducts)
            {
                var exitingPurchaseOrder = _purchaseOrderRepository
               .AllIncluding(c => c.PurchaseOrderItems)
               .Where(c => c.PurchaseOrderItems.Any(c => c.ProductId == item.Id)).Any();

                if (exitingPurchaseOrder)
                {
                    _logger.LogError("Proudct can not be Deleted because it is use in Purchase Order");
                    return ServiceResponse<bool>.Return409("Proudct can not be Deleted because it is use in Purchase Order");
                }

                var exitingSalesOrder = _salesOrderRepository
                   .AllIncluding(c => c.SalesOrderItems)
                   .Where(c => c.SalesOrderItems.Any(c => c.ProductId == item.Id)).Any();

                if (exitingSalesOrder)
                {
                    _logger.LogError("Proudct can not be Deleted because it is use in Sales Order");
                    return ServiceResponse<bool>.Return409("Proudct can not be Deleted because it is use in Sales Order");
                }

                var stockTransferItem = _stockTransferItemRepository
                   .AllIncluding(c => c.StockTransfer)
                   .Where(c => !c.StockTransfer.IsDeleted && c.ProductId == item.Id).Any();

                if (stockTransferItem)
                {
                    _logger.LogError("Proudct can not be Deleted because it is use in Sales Order");
                    return ServiceResponse<bool>.Return409("Proudct can not be Deleted because it is use in Stock Transfer");
                }
                _productRepository.Delete(item);
            }
            if (await _uow.SaveAsync() <= 0)
            {
                _logger.LogError("Error While deleting Proudct.");
                return ServiceResponse<bool>.Return500();
            }

            return ServiceResponse<bool>.ReturnSuccess();
        }
    }
}
