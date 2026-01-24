using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Helper;
using POS.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR
{
    public class GetProductStockCountCommandHandler(
        IProductStockRepository _productStockRepository) : IRequestHandler<GetProductStockCountCommand, ServiceResponse<int>>
    {
        public async Task<ServiceResponse<int>> Handle(GetProductStockCountCommand request, CancellationToken cancellationToken)
        {
            if (request.ProductId == Guid.Empty && request.LocationId == Guid.Empty)
            {
                return ServiceResponse<int>.Return404("ProductId and LocationId cannot be empty");
            }
            var inventory = await _productStockRepository.All
                .Where(c => c.ProductId == request.ProductId && c.LocationId == request.LocationId)
                .FirstOrDefaultAsync(cancellationToken);

            if (inventory == null)
            {
                return ServiceResponse<int>.ReturnResultWith200(0);
            }

            return ServiceResponse<int>.ReturnResultWith200((int)inventory.CurrentStock);
        }
    }
}
