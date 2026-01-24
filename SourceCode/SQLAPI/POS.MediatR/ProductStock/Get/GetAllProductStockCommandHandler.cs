using MediatR;
using POS.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR
{
    public class GetAllProductStockCommandHandler(
        IProductStockRepository _productStockRepository) : IRequestHandler<GetAllProductStockCommand, ProductStockList>
    {
        public async Task<ProductStockList> Handle(GetAllProductStockCommand request, CancellationToken cancellationToken)
        {
            return await _productStockRepository.GetProducStocks(request.ProductStockResource);
        }
    }
}
