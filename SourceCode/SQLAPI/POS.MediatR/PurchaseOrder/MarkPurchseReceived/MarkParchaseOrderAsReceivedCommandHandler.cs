using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
using POS.Domain;
using POS.Helper;
using POS.MediatR;
using POS.Repository;

namespace POS.MediatR.PurchaseOrder.Handlers
{
    public class MarkParchaseOrderAsReceivedCommandHandler(
        IPurchaseOrderRepository purchaseOrderRepository,
        IUnitOfWork<POSDbContext> uow,
        ILogger<MarkParchaseOrderAsReceivedCommandHandler> logger)
        : IRequestHandler<MarkParchaseOrderAsReceivedCommand, ServiceResponse<bool>>
    {
        public async Task<ServiceResponse<bool>> Handle(MarkParchaseOrderAsReceivedCommand request, CancellationToken cancellationToken)
        {
            var purchaseOrder = await purchaseOrderRepository.All
                .Include(d => d.PurchaseOrderItems)
                .ThenInclude(t => t.PurchaseOrderItemTaxes)
                .Where(c => c.Id == request.Id).FirstOrDefaultAsync();

            if (purchaseOrder == null)
            {
                logger.LogError("Purchase order does not exists.");
                return ServiceResponse<bool>.Return404();
            }

            if (purchaseOrder.DeliveryStatus == PurchaseDeliveryStatus.RECEIVED)
            {
                return ServiceResponse<bool>.ReturnSuccess();
            }

            purchaseOrder.DeliveryStatus = PurchaseDeliveryStatus.RECEIVED;
            
            purchaseOrderRepository.Update(purchaseOrder);

            if (await uow.SaveAsync() <= 0)
            {
                logger.LogError("Error while updating Purchase Order.");
                return ServiceResponse<bool>.Return500();
            }

            return ServiceResponse<bool>.ReturnSuccess();
        }
    }
}
