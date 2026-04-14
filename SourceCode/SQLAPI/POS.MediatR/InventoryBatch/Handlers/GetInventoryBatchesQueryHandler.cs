using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Common.UnitOfWork;
using POS.Data.Entities.Inventory;
using POS.Domain;
using POS.Helper;
using POS.MediatR.InventoryBatch.Queries;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.InventoryBatch.Handlers
{
    public class GetInventoryBatchesQueryHandler : IRequestHandler<GetInventoryBatchesQuery, ServiceResponse<List<Data.Entities.Inventory.InventoryBatch>>>
    {
        private readonly IUnitOfWork<POSDbContext> _uow;

        public GetInventoryBatchesQueryHandler(IUnitOfWork<POSDbContext> uow)
        {
            _uow = uow;
        }

        public async Task<ServiceResponse<List<Data.Entities.Inventory.InventoryBatch>>> Handle(GetInventoryBatchesQuery request, CancellationToken cancellationToken)
        {
            var batches = await _uow.Context.InventoryBatches
                .Where(b => b.ProductId == request.ProductId && b.Quantity > 0 && b.IsActive)
                .OrderBy(b => b.ExpiryDate)
                .ToListAsync(cancellationToken);

            return ServiceResponse<List<Data.Entities.Inventory.InventoryBatch>>.ReturnResultWith200(batches);
        }
    }
}
