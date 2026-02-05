using MediatR;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Helper;
using POS.Repository;
using System.Threading;
using System.Threading.Tasks;
using POS.Domain;

namespace POS.MediatR.ProductStock.Handlers
{
    public class BulkAdjustProductStockCommandHandler : IRequestHandler<Commands.BulkAdjustProductStockCommand, ServiceResponse<bool>>
    {
        private readonly IProductStockRepository _productStockRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;

        public BulkAdjustProductStockCommandHandler(
            IProductStockRepository productStockRepository,
            IUnitOfWork<POSDbContext> uow)
        {
            _productStockRepository = productStockRepository;
            _uow = uow;
        }

        public async Task<ServiceResponse<bool>> Handle(Commands.BulkAdjustProductStockCommand request, CancellationToken cancellationToken)
        {
            if (request.Adjustments == null || request.Adjustments.Count == 0)
            {
                return ServiceResponse<bool>.ReturnFailed(400, "No adjustments provided.");
            }

            foreach (var stock in request.Adjustments)
            {
                await _productStockRepository.UpdateProductStockAsync(stock.LocationId, stock.ProductId, stock.NewStockValue);
            }

            await _uow.SaveAsync();

            return ServiceResponse<bool>.ReturnResultWith200(true);
        }
    }
}
