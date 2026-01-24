using AutoMapper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto;
using POS.Helper;
using POS.MediatR.CommandAndQuery;
using POS.Repository;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Handlers
{
    public class GetSalesOrderQuaryHandler : IRequestHandler<GetSalesOrderCommand, ServiceResponse<SalesOrderDto>>
    {
        private readonly ISalesOrderRepository _salesOrderRepository;
        private readonly IMapper _mapper;
        private readonly Helper.PathHelper _pathHelper;

        public GetSalesOrderQuaryHandler(ISalesOrderRepository salesOrderRepository,
            IMapper mapper,
            Helper.PathHelper pathHelper)
        {
            _salesOrderRepository = salesOrderRepository;
            _mapper = mapper;
            _pathHelper = pathHelper;
        }

        public async Task<ServiceResponse<SalesOrderDto>> Handle(GetSalesOrderCommand request, CancellationToken cancellationToken)
        {
            var entity = await _salesOrderRepository.All
                 .Include(c => c.SalesOrderPayments)
                 .Include(c => c.Customer)
                    .ThenInclude(c => c.BillingAddress)
                 .Include(c => c.Customer)
                    .ThenInclude(c => c.ShippingAddress)
                 .Include(c => c.Location)
                 .Include(c => c.SalesOrderItems)
                     .ThenInclude(c => c.SalesOrderItemTaxes)
                     .ThenInclude(cs => cs.Tax)
                .Include(c => c.SalesOrderItems)
                    .ThenInclude(c => c.Product)
                .Include(c => c.SalesOrderItems)
                    .ThenInclude(c => c.UnitConversation)
                .Include(c => c.CreatedByUser)
                .Where(c => c.Id == request.Id)
                .AsSplitQuery()
                .FirstOrDefaultAsync();
            if (entity == null)
            {
                return ServiceResponse<SalesOrderDto>.Return404();
            }
            var dto = _mapper.Map<SalesOrderDto>(entity);
            foreach (var item in dto.SalesOrderItems)
            {
                if (!string.IsNullOrWhiteSpace(item.Product.ProductUrl))
                {
                    item.Product.ProductUrl = Path.Combine(_pathHelper.ProductImagePath, item.Product.ProductUrl);
                }
            }
            return ServiceResponse<SalesOrderDto>.ReturnResultWith200(dto);
        }
    }
}
