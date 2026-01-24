using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using POS.Data.Dto;
using POS.Data.Dto.PurchaseOrder;
using POS.Repository;

namespace POS.MediatR.PurchaseOrder.Handlers
{
    public class GetPurchaseOrderTaxItemTotalCommandHandler 
        : IRequestHandler<GetPurchaseOrderTaxItemTotalCommand, List<PurchaseOrderItemTaxDto>>
    {
        private readonly IPurchaseOrderRepository _purchaseOrderRepository;

        public GetPurchaseOrderTaxItemTotalCommandHandler(IPurchaseOrderRepository purchaseOrderRepository)
        {
            _purchaseOrderRepository = purchaseOrderRepository;
        }

        public async Task<List<PurchaseOrderItemTaxDto>> Handle(GetPurchaseOrderTaxItemTotalCommand request, CancellationToken cancellationToken)
        {
            return await _purchaseOrderRepository.GetAllPurchaseOrderItemTaxTotal(request.PurchaseOrderResource);
        }
    }
}
