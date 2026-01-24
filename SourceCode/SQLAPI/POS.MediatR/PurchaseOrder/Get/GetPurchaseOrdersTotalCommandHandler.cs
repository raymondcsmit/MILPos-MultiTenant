using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using POS.Data.Dto.PurchaseOrder;
using POS.MediatR.CommandAndQuery;
using POS.MediatR;
using POS.Repository;

namespace POS.MediatR
{
    public class GetPurchaseOrdersTotalCommandHandler : IRequestHandler<GetPurchaseOrdersTotalCommand, PurchaseSalesTotalDto>
    {
        private readonly IPurchaseOrderRepository _purchaseOrderRepository;

        public GetPurchaseOrdersTotalCommandHandler(IPurchaseOrderRepository purchaseOrderRepository)
        {
            _purchaseOrderRepository = purchaseOrderRepository;
        }

        public async Task<PurchaseSalesTotalDto> Handle(GetPurchaseOrdersTotalCommand request, CancellationToken cancellationToken)
        {
            return await _purchaseOrderRepository.GetAllPurchaseOrdersTotal(request.PurchaseOrderResource);
        }
    }
}
