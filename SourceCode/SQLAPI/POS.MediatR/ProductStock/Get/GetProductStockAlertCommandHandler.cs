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
    public class GetProductStockAlertCommandHandler(
        IProductStockRepository productStockRepository)
        : IRequestHandler<GetProductStockAlertCommand, ProductStockAlertList>
    {
        public async Task<ProductStockAlertList> Handle(GetProductStockAlertCommand request, CancellationToken cancellationToken)
        {
            return await productStockRepository.GetProductStockAlertsAsync(request.ProductStockAlertResource);
        }
    }
}
