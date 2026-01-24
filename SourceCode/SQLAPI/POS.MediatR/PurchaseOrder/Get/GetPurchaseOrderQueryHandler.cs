using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto;
using POS.Helper;
using POS.MediatR.CommandAndQuery;
using POS.Repository;

namespace POS.MediatR.Handlers
{
    public class GetPurchaseOrderQueryHandler : IRequestHandler<GetPurchaseOrderQuery, ServiceResponse<PurchaseOrderDto>>
    {
        private readonly IPurchaseOrderRepository _purchaseOrderRepository;
        private readonly IMapper _mapper;
        private readonly Helper.PathHelper _pathHelper;

        public GetPurchaseOrderQueryHandler(IPurchaseOrderRepository purchaseOrderRepository,
            IMapper mapper,
            PathHelper pathHelper)
        {
            _purchaseOrderRepository = purchaseOrderRepository;
            _mapper = mapper;
            _pathHelper = pathHelper;
        }

        public async Task<ServiceResponse<PurchaseOrderDto>> Handle(GetPurchaseOrderQuery request, CancellationToken cancellationToken)
        {
            var entity = await _purchaseOrderRepository.All
                 .Where(c => c.Id == request.Id)
                 .Include(c => c.CreatedByUser)
                .Include(c => c.PurchaseOrderPayments)
                .Include(c => c.Supplier)
                    .ThenInclude(c => c.BillingAddress)
                .Include(c => c.Supplier)
                    .ThenInclude(c => c.ShippingAddress)
                .Include(c => c.PurchaseOrderItems)
                    .ThenInclude(c => c.PurchaseOrderItemTaxes)
                    .ThenInclude(cs => cs.Tax)
                .Include(c => c.PurchaseOrderItems)
                    .ThenInclude(c => c.Product)
                 .Include(c => c.PurchaseOrderItems)
                    .ThenInclude(c => c.UnitConversation)
                    .Include(c => c.Location)
                .FirstOrDefaultAsync();

            var dto = _mapper.Map<PurchaseOrderDto>(entity);

            foreach (var item in dto.PurchaseOrderItems)
            {
                if (!string.IsNullOrWhiteSpace(item.Product.ProductUrl))
                {
                    item.Product.ProductUrl = Path.Combine(_pathHelper.ProductImagePath, item.Product.ProductUrl);
                }
            }

            return ServiceResponse<PurchaseOrderDto>.ReturnResultWith200(dto);
        }
    }
}
